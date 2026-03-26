import Image from "next/image";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlighter } from "@/components/ui/highlighter";
import { PricingSection } from "@/app/components/PricingSection";

const marqueeItems = [
  "IELTS Writing Corrections",
  "Speaking Feedback",
  "Band Score Coaching",
  "Vocabulary Builder",
  "Grammar Precision",
  "Study Plan Engine",
];

const bentoCards = [
  {
    title: "Band-Targeted Feedback",
    body: "Get corrections mapped to IELTS band descriptors so every revision has clear purpose.",
    stat: "Band 6.0 -> 7.5",
    layout: "lg:col-span-2 lg:row-span-2",
  },
  {
    title: "Speaking Clarity Coach",
    body: "Practice naturally and receive structure, vocabulary, and fluency suggestions in seconds.",
    stat: "Real-time Guidance",
    layout: "lg:col-span-1",
  },
  {
    title: "Context Dictionary",
    body: "Highlight any phrase in chat to translate and learn meaning in context, not in isolation.",
    stat: "1-click Lookup",
    layout: "lg:col-span-1",
  },
  {
    title: "Session to Flashcards",
    body: "Turn useful words from real conversations into reusable memory cards automatically.",
    stat: "Retention-first",
    layout: "lg:col-span-2",
  },
];

const faqs = [
  {
    q: "Can beginners use IELTS Scholar?",
    a: "Yes. The feedback adapts to your proficiency level and target band.",
  },
  {
    q: "Does it support both Writing and Speaking?",
    a: "Yes. You can practice and get structured coaching for both modules.",
  },
  {
    q: "Can I track my progress over time?",
    a: "Yes. Session history and insight panels help you review recurring patterns and improvements.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-br from-surface via-[#f3fbf6] to-[#e9f8ff] text-on-surface">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-primary-container/60 blur-3xl" />
        <div className="absolute right-0 top-28 h-72 w-72 rounded-full bg-[#ffe08a]/65 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#e9f8ff]/80 blur-3xl" />
      </div>
      <section className="relative overflow-hidden px-6 pb-20 pt-8 sm:px-10 lg:px-16">
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="IELTS Scholar" width={100} height={100} className="rounded-sm" />
            <p className="text-sm leading-none sm:text-base lg:text-[22px]">
              <span className="font-semibold">IELTS Scholar:</span>{" "}
              <span className="text-on-surface-variant">AI Academic Practice Studio</span>
            </p>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/login" className="text-base font-medium text-on-surface">
              Sign In
            </Link>
            <Button asChild size="lg" className="rounded-xl bg-black px-6 text-base font-medium text-white hover:bg-black/90">
              <Link href="/sign-up">Start Free</Link>
            </Button>
          </div>
        </header>

        <div className="relative mx-auto mt-16 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <h1
              className="mt-5 max-w-2xl text-7xl leading-[0.98] tracking-[-0.02em] text-on-surface"
              style={{ fontFamily: "Georgia, Cambria, Times New Roman, Times, serif" }}
            >
              <Highlighter action="highlight" color="#ffe08a" animationDuration={700} isView>
                Study Smarter.
              </Highlighter>
              <br />
              <Highlighter action="underline" color="#de9658" animationDuration={700} isView>
                Write Better. Speak
              </Highlighter>
              <br />
              <Highlighter action="box" color="#f4a261" animationDuration={700} padding={4} isView>
                with Confidence.
              </Highlighter>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant">
              IELTS Scholar turns every practice session into actionable feedback with corrections,
              explanations, and next-step training tailored to your target band.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-2xl bg-black px-6 text-white hover:bg-black/90">
                <Link href="/sign-up">Create Account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-2xl border-on-surface/70 bg-transparent px-6 text-on-surface hover:bg-white/60"
              >
                <Link href="/chat">Explore Chat Experience</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Image
              src="/hero.png"
              alt="AI Practice Studio preview"
              width={960}
              height={768}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-outline-variant/25 bg-white/65 py-4">
        <div className="relative overflow-hidden">
          <div className="landing-marquee-track flex min-w-max items-center gap-3 px-4">
            {[...marqueeItems, ...marqueeItems].map((item, idx) => (
              <Badge
                key={`${item}-${idx}`}
                variant="outline"
                className="h-auto border-outline-variant/40 bg-white px-4 py-1.5 text-xs text-on-surface-variant"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="mb-7">
          <Badge variant="outline" className="border-outline-variant/40 bg-white px-3 text-primary">
            Why It Works
          </Badge>
          <h2
            className="mt-3 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A Bento System for{" "}
            <Highlighter action="underline" color="#ffd166" animationDuration={700} isView>
              Real IELTS Progress
            </Highlighter>
          </h2>
        </div>

        <div className="grid auto-rows-[minmax(180px,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bentoCards.map((card) => (
            <Card
              key={card.title}
              className={`border border-outline-variant/30 bg-gradient-to-b from-white to-surface-container-low ${card.layout}`}
            >
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                  {card.stat}
                </p>
                <CardTitle className="text-lg leading-tight text-on-surface">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm leading-6 text-on-surface-variant">{card.body}</p>
                {card.title === "Band-Targeted Feedback" ? (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {["Task Response", "Coherence", "Lexical Resource", "Grammar"].map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="h-auto border-outline-variant/35 bg-white px-3 py-1.5 text-[11px] font-medium text-on-surface-variant"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10 lg:px-16">
        <Card className="border border-outline-variant/30 bg-gradient-to-r from-white via-white to-surface-container-low">
          <CardContent className="py-7 sm:py-9">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="border-outline-variant/40 bg-white px-3 text-primary">
                Flow
              </Badge>
              <h3
                className="mt-3 text-2xl font-semibold sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <Highlighter action="box" color="#f4a261" animationDuration={700} padding={4} isView>
                  Practice {"->"} Analyze {"->"} Improve
                </Highlighter>
              </h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                A focused 3-step learning loop that turns every response into a measurable improvement.
              </p>
            </div>

            <div className="relative mt-8">
              <div className="absolute left-8 right-8 top-5 hidden h-px bg-linear-to-r from-primary/20 via-primary/45 to-primary/20 md:block" />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Submit Response",
                    desc: "Send writing or speaking practice in natural language.",
                    meta: "Input",
                  },
                  {
                    title: "Get Precise Feedback",
                    desc: "Receive structured correction with reasons and improved versions.",
                    meta: "Analysis",
                  },
                  {
                    title: "Track Stronger Output",
                    desc: "Use progress patterns to improve your next attempt faster.",
                    meta: "Outcome",
                  },
                ].map((step, i) => (
                  <Card key={step.title} className="relative border border-outline-variant/30 bg-white/90 backdrop-blur">
                    <CardContent className="py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-white text-sm font-semibold text-primary">
                          {i + 1}
                        </span>
                        <Badge variant="outline" className="border-outline-variant/35 bg-surface-container-low px-2.5 text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                          {step.meta}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-on-surface">{step.title}</p>
                      <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{step.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <PricingSection />

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10 lg:px-16">
        <div className="mb-7">
          <Badge variant="outline" className="border-outline-variant/40 bg-white px-3 text-primary">
            FAQ
          </Badge>
          <h3
            className="mt-3 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Common{" "}
            <Highlighter action="circle" color="#f4a261" animationDuration={700} padding={6} isView>
              Questions
            </Highlighter>
          </h3>
        </div>
        <Card className="border border-outline-variant/30 bg-white">
          <CardContent className="py-2">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <section className="border-t border-outline-variant/30 bg-gradient-to-r from-white to-surface-container-low px-6 py-14 text-center sm:px-10 lg:px-16">
        <Badge variant="outline" className="border-outline-variant/40 bg-white px-3 text-primary">
          Start Today
        </Badge>
        <h3
          className="mt-3 text-3xl font-semibold sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Turn daily practice into a{" "}
          <Highlighter action="highlight" color="#ffe08a" animationDuration={700} isView>
            higher IELTS score.
          </Highlighter>
        </h3>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="bg-primary text-white hover:bg-primary-fixed-variant">
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" className="border-outline-variant/45 bg-white text-on-surface">
            <Link href="/login">I Already Have Account</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
