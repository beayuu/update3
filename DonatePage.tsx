import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { NavigationBarSection } from "./sections/NavigationBarSection";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const socialLinks = [{ alt: "Social links", src: "/figmaAssets/social-links.svg" }];

const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash", color: "#0078FF", type: "qr" },
  { id: "maya", label: "Maya", color: "#22C55E", type: "qr" },
  { id: "debit", label: "Debit Card", color: "#7c3aed", type: "card" },
  { id: "credit", label: "Credit Card", color: "#f59e0b", type: "card" },
] as const;

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

const donationFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Donation amount is required")
    .refine((v) => !isNaN(Number(v.replace(/[^0-9.]/g, ""))) && Number(v.replace(/[^0-9.]/g, "")) >= 1, "Minimum donation is ₱1")
    .refine((v) => Number(v.replace(/[^0-9.]/g, "")) <= 100000, "Maximum donation is ₱100,000"),
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  mobilePhone: z
    .string()
    .trim()
    .min(1, "Mobile phone is required")
    .regex(/^[\d\s\-\+\(\)]{7,20}$/, "Enter a valid phone number"),
  address: z.string().trim().min(1, "Address is required"),
});

type DonationFormValues = z.infer<typeof donationFormSchema>;

const inputClass =
  "h-[42px] w-full rounded-[5px] border-2 border-[#052698] bg-white px-4 [font-family:'DM_Sans',Helvetica] text-[15px] font-bold text-black shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0";

export const DonatePage = (): JSX.Element => {
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [methodError, setMethodError] = useState(false);

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      amount: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobilePhone: "",
      address: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const amountParam = params.get("amount");
    if (amountParam) form.setValue("amount", amountParam);
  }, [search]);

  const onSubmit = (values: DonationFormValues) => {
    if (!selectedMethod) {
      setMethodError(true);
      return;
    }
    if (!isAuthenticated) {
      toast({
        title: "Please sign in to donate",
        description: "Create an account or log in so we can record your donation.",
      });
      setLocation("/auth");
      return;
    }

    const numeric = Math.round(Number(values.amount.replace(/[^0-9.]/g, "")));
    const donorName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ");
    const methodInfo = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
    const params = new URLSearchParams({
      method: selectedMethod,
      amount: String(numeric),
      name: donorName,
      email: values.email,
    });

    if (methodInfo.type === "qr") {
      setLocation(`/donate/qr?${params}`);
    } else {
      setLocation(`/donate/card?${params}`);
    }
  };

  return (
    <main className="relative w-full overflow-x-hidden bg-black animate-in fade-in duration-500">
      <NavigationBarSection />

      <section className="relative flex min-h-dvh bg-black pt-[120px]" aria-label="Donation form">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-4 pb-10 sm:px-6 md:grid-cols-[360px_minmax(0,1fr)] md:gap-0 md:px-0 md:pb-0 lg:grid-cols-[600px_minmax(0,1fr)]">
          <div className="relative hidden w-full overflow-hidden md:block">
            <img
              src="/figmaAssets/donate-hero-clear.png"
              alt="Coral reef underwater"
              className="absolute inset-0 h-full w-full object-cover"
              data-testid="img-donate-hero"
            />
          </div>

          <div className="flex items-start justify-center lg:px-[40px] pt-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center gap-2.5"
                data-testid="form-donate"
              >
                <h1
                  className="w-full text-center [font-family:'Inter',Helvetica] text-[36px] font-bold leading-tight text-white sm:text-[44px] lg:text-[48px]"
                  data-testid="text-donate-title"
                >
                  Donation Form
                </h1>
                <p className="w-full text-center [font-family:'Poppins',Helvetica] text-[13px] font-normal leading-snug text-white sm:text-[14px] mb-2">
                  Support reef conservation. Every peso makes a difference.
                </p>

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="   Amount (e.g. 500):"
                          data-testid="input-donation-amount"
                          className="h-[42px] w-full rounded-[5px] border-0 bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-4 [font-family:'DM_Sans',Helvetica] text-[15px] font-bold text-white shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] placeholder:text-white/90 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Name row */}
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormControl><Input {...field} placeholder="   First Name:" data-testid="input-firstName" className={inputClass} /></FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="middleName" render={({ field }) => (
                    <FormItem>
                      <FormControl><Input {...field} placeholder="   Middle Name:" data-testid="input-middleName" className={inputClass} /></FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl><Input {...field} placeholder="   Last Name:" data-testid="input-lastName" className={inputClass} /></FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl><Input {...field} type="email" placeholder="   Email:" data-testid="input-email" className={inputClass} /></FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="mobilePhone" render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl><Input {...field} type="tel" placeholder="   Mobile Phone:" data-testid="input-mobilePhone" className={inputClass} /></FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl><Input {...field} placeholder="   Address:" data-testid="input-address" className={inputClass} /></FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                {/* Payment method selection */}
                <div className="w-full">
                  <p className="mb-2 text-sm font-semibold text-white/80">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        data-testid={`button-payment-${m.id}`}
                        onClick={() => { setSelectedMethod(m.id); setMethodError(false); }}
                        className={`h-11 rounded-lg border-2 text-sm font-bold transition-all duration-200 ${
                          selectedMethod === m.id
                            ? "text-white border-transparent"
                            : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10"
                        }`}
                        style={selectedMethod === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {methodError && (
                    <p className="mt-1 text-xs text-red-400">Please select a payment method</p>
                  )}
                  {selectedMethod && (
                    <p className="mt-1 text-xs text-white/50">
                      {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.type === "qr"
                        ? "You will be redirected to a QR code payment page."
                        : "You will be redirected to enter your card details."}
                    </p>
                  )}
                </div>

                <div className="flex w-full justify-center mt-2">
                  <Button
                    type="submit"
                    data-testid="button-submit-donation"
                    className="h-[46px] w-[160px] rounded-[5px] border-2 border-transparent bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[22px] font-bold text-white shadow-[0px_5px_20px_-2px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:border-[#052698] hover:bg-none hover:bg-white hover:text-[#052698]"
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </section>

      <footer
        id="contacts"
        className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040]"
      >
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-10 sm:px-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-xl font-normal text-white">
              Let&apos;s work together
            </p>
            <nav aria-label="Social media">
              {socialLinks.map((link) => (
                <img key={link.src} className="h-6 w-[120px]" alt={link.alt} src={link.src} />
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};
