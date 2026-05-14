import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Adoption, Coral } from "@shared/schema";

const socialLinks = [
  {
    alt: "Social links",
    src: "/figmaAssets/social-links.svg",
  },
];

const PLACEHOLDER_IMAGE = "/figmaAssets/adopt/coral-1.png";
const CORALS_KEY = ["/api/corals"] as const;

export const AdoptPage = (): JSX.Element => {
  const [amount, setAmount] = useState("1");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const coralsQuery = useQuery<Coral[]>({ queryKey: CORALS_KEY });
  const corals = useMemo(() => coralsQuery.data ?? [], [coralsQuery.data]);

  useEffect(() => {
    if (corals.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !corals.find((c) => c.id === activeId)) {
      setActiveId(corals[0].id);
    }
  }, [corals, activeId]);

  const activeCoral = corals.find((c) => c.id === activeId) ?? null;
  const stockLeft = activeCoral?.stock ?? 0;
  const isSoldOut = !!activeCoral && stockLeft <= 0;

  const adoptMutation = useMutation({
    mutationFn: async () => {
      if (!activeCoral) throw new Error("Pick a coral first");
      const parsedAmount = parseInt(amount, 10);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }
      if (parsedAmount > stockLeft) {
        throw new Error(`Only ${stockLeft} left in stock`);
      }
      const res = await apiRequest("POST", "/api/adoptions", {
        coralId: activeCoral.id,
        amount: parsedAmount,
      });
      return (await res.json()) as Adoption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/adoptions"] });
      queryClient.invalidateQueries({ queryKey: CORALS_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-breakdown"] });
      toast({
        title: "Adoption confirmed",
        description: `You've adopted ${activeCoral?.name}. Thank you!`,
      });
      setAmount("1");
      setLocation("/account");
    },
    onError: (err: Error) => {
      const msg = err.message.replace(/^\d+:\s*/, "");
      let description = msg;
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.message) description = parsed.message;
      } catch {
        // leave as-is
      }
      toast({
        title: "Couldn't complete adoption",
        description,
        variant: "destructive",
      });
    },
  });

  const handleAdopt = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in to adopt",
        description: "Create a free account to track your reef.",
      });
      setLocation("/auth");
      return;
    }
    adoptMutation.mutate();
  };

  const totalCost = activeCoral
    ? Math.max(0, parseInt(amount, 10) || 0) * activeCoral.price
    : 0;

  return (
    <main className="relative w-full overflow-x-hidden bg-black animate-in fade-in duration-500">
      <NavigationBarSection />
      <section
        className="relative flex min-h-dvh items-center justify-center bg-black px-4 pb-10 pt-[120px] sm:px-6 lg:px-12 lg:pb-16"
        aria-label="Adopt a coral"
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-center gap-8 lg:flex-row lg:items-center lg:gap-12">
          <div className="grid h-full max-h-[70vh] w-full max-w-[520px] flex-shrink-0 grid-cols-[1fr_2fr] gap-3 lg:max-h-[70vh]">
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              {coralsQuery.isLoading && corals.length === 0 ? (
                <div className="flex h-full items-center justify-center text-white/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : corals.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-md bg-white/5 p-4 text-center text-xs text-white/50">
                  No corals yet
                </div>
              ) : (
                corals.map((coral, index) => (
                  <button
                    key={coral.id}
                    type="button"
                    onClick={() => setActiveId(coral.id)}
                    data-testid={`button-coral-${index + 1}`}
                    className={`flex-1 overflow-hidden rounded-[4.185px] transition-all duration-200 focus:outline-none ${
                      activeId === coral.id
                        ? "ring-2 ring-[#21BCEE] ring-offset-2 ring-offset-black"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={coral.image}
                      alt={coral.name}
                      className="h-full w-full object-cover"
                      data-testid={`img-coral-${index + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          PLACEHOLDER_IMAGE;
                      }}
                    />
                  </button>
                ))
              )}
            </div>
            <div className="flex h-full min-h-0">
              {activeCoral ? (
                <img
                  key={activeCoral.id}
                  src={activeCoral.image}
                  alt={activeCoral.name}
                  className="h-full w-full rounded-[4.185px] object-cover animate-in fade-in duration-500"
                  data-testid="img-coral-featured"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      PLACEHOLDER_IMAGE;
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-[4.185px] bg-white/5 text-white/50">
                  No coral selected
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full max-w-[490px] flex-col gap-3 lg:gap-4">
            <h1
              className="[font-family:'Inter',Helvetica] text-[36px] font-bold leading-tight text-white sm:text-[44px] lg:text-[52px]"
              data-testid="text-adopt-title"
            >
              Adopt a Coral
            </h1>
            <p
              className="[font-family:'DM_Sans',Helvetica] text-[20px] font-medium text-white sm:text-[24px] lg:text-[28px]"
              data-testid="text-coral-name"
            >
              {activeCoral?.name ?? "—"}
            </p>
            <p className="[font-family:'Poppins',Helvetica] text-[14px] font-normal leading-relaxed text-white sm:text-[15px] lg:text-[16px]">
              {activeCoral?.description ||
                "Pick a coral to learn more and confirm your adoption."}
            </p>

            {activeCoral && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/60">
                    Price per coral
                  </p>
                  <p
                    className="text-xl font-bold text-white"
                    data-testid="text-coral-price"
                  >
                    ${activeCoral.price}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/60">
                    Available
                  </p>
                  <p
                    className={`text-xl font-bold ${isSoldOut ? "text-red-300" : "text-white"}`}
                    data-testid="text-coral-stock"
                  >
                    {isSoldOut ? "Sold out" : `${stockLeft} left`}
                  </p>
                </div>
              </div>
            )}

            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
              max={stockLeft || undefined}
              placeholder="   Amount:"
              disabled={!activeCoral || isSoldOut}
              data-testid="input-amount"
              className="h-[44px] rounded-[5px] border-2 border-[#052698] bg-white px-4 [font-family:'DM_Sans',Helvetica] text-[18px] font-bold text-black shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
            />

            {activeCoral && totalCost > 0 && (
              <p
                className="text-sm text-white/70"
                data-testid="text-total-cost"
              >
                Total:{" "}
                <span className="font-semibold text-white">
                  ${totalCost.toLocaleString()}
                </span>
              </p>
            )}

            <Button
              type="button"
              onClick={handleAdopt}
              disabled={
                adoptMutation.isPending || !activeCoral || isSoldOut
              }
              data-testid="button-adopt-coral"
              className="h-[46px] w-full max-w-[240px] rounded-[5px] border-2 border-transparent bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[22px] font-bold text-white shadow-[0px_5.09px_20.359px_-2px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:border-[#052698] hover:bg-none hover:bg-white hover:text-[#052698] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[24px]"
            >
              {adoptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Adopting…
                </>
              ) : isSoldOut ? (
                "Sold out"
              ) : (
                "Adopt a Coral"
              )}
            </Button>
          </div>
        </div>
      </section>

      <footer
        id="contacts"
        className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040] scroll-mt-24"
      >
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-16 sm:px-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-2xl font-normal leading-[28.8px] tracking-[-0.48px] text-white">
              Let&apos;s work together
            </p>
            <nav aria-label="Social media">
              {socialLinks.map((link) => (
                <img
                  key={link.src}
                  className="h-6 w-[120px]"
                  alt={link.alt}
                  src={link.src}
                />
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};
