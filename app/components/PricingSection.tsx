"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Highlighter } from "@/components/ui/highlighter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BillingCycle = "monthly" | "annual";

type PricingPlan = {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  summary: string;
  cta: string;
  href: string;
  featured: boolean;
  points: string[];
};

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: "$0",
    annualPrice: "$0",
    summary: "For learners testing the workflow before a serious exam timeline.",
    cta: "Start Free",
    href: "/sign-up",
    featured: false,
    points: ["Basic writing corrections", "Limited speaking practice", "7-day session history"],
  },
  {
    name: "Pro",
    monthlyPrice: "$15",
    annualPrice: "$12",
    summary: "For consistent IELTS prep with deep coaching and progress loops.",
    cta: "Upgrade to Pro",
    href: "/sign-up",
    featured: true,
    points: [
      "Unlimited writing + speaking sessions",
      "Band-descriptor based feedback",
      "Vocabulary-to-flashcard automation",
      "Priority response speed",
    ],
  },
  {
    name: "Team",
    monthlyPrice: "$49",
    annualPrice: "$39",
    summary: "For tutors and centers managing multiple learners and cohorts.",
    cta: "Contact Sales",
    href: "/login",
    featured: false,
    points: [
      "Shared project workspaces",
      "Role-based learner management",
      "Cohort progress exports",
      "Dedicated onboarding support",
    ],
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  const cycleText = useMemo(
    () => (billing === "monthly" ? "/month" : "/month, billed yearly"),
    [billing],
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 sm:px-10 lg:px-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="border-outline-variant/40 bg-white px-3 text-primary">
            Pricing
          </Badge>
          <h3
            className="mt-3 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Choose Your{" "}
            <Highlighter action="underline" color="#ffd166" animationDuration={700} isView>
              Study Velocity
            </Highlighter>
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            Transparent pricing. Switch between monthly and annual anytime.
          </p>
        </div>

        <Tabs
          value={billing}
          onValueChange={(value) => setBilling(value as BillingCycle)}
          className="w-auto"
        >
          <TabsList className="rounded-lg border border-outline-variant/35 bg-white p-1">
            <TabsTrigger
              value="monthly"
              className="rounded-md px-3 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger
              value="annual"
              className="rounded-md px-3 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Annual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((plan) => {
          const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <Card
              key={plan.name}
              className={`relative h-full border ${
                plan.featured
                  ? "border-primary/35 bg-gradient-to-b from-white to-primary/12"
                  : "border-outline-variant/30 bg-gradient-to-b from-white to-surface-container-low/60"
              }`}
            >
              <CardHeader className="border-b border-outline-variant/20">
                {plan.featured ? (
                  <Badge className="mb-2 w-fit bg-primary text-white">Most Popular</Badge>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                  {plan.name}
                </p>
                <div className="mt-1 flex items-end gap-1">
                  <p className="text-4xl font-semibold text-on-surface">{price}</p>
                  <p className="pb-1 text-xs text-on-surface-variant">{cycleText}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{plan.summary}</p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-green-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto border-outline-variant/20">
                <Button
                  asChild
                  size="lg"
                  className={`w-full ${
                    plan.featured
                      ? "bg-primary text-white hover:bg-primary-fixed-variant"
                      : "border border-outline-variant/45 bg-white text-on-surface hover:bg-surface-container-low"
                  }`}
                  variant={plan.featured ? "default" : "outline"}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
