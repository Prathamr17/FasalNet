// pages/HomePage.js — Premium AI + Agriculture SaaS landing page.
// All existing i18n keys (home.*) are reused as-is; new copy lives under
// the "landing" namespace in en/hi/mr so every visible string stays
// translated and layout-safe across languages. No backend/auth logic was
// changed — only presentation.
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Sprout,
  Bot,
  TrendingUp,
  CloudSun,
  Warehouse,
  ShieldCheck,
  Languages,
  MapPin,
  ArrowRight,
  Quote,
  CheckCircle2,
  Sparkles,
  Radar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container, Eyebrow, SectionHeading } from "../components/ui/Container";
import Reveal from "../components/ui/Reveal";
import { RevealGroup, RevealItem } from "../components/ui/RevealGroup";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const STATS = [
    { num: t("home.stat_1_num"), label: t("home.stat_1_lbl"), sub: t("home.stat_1_sub"), Icon: TrendingUp },
    { num: t("home.stat_2_num"), label: t("home.stat_2_lbl"), sub: t("home.stat_2_sub"), Icon: Warehouse },
    { num: t("home.stat_3_num"), label: t("home.stat_3_lbl"), sub: t("home.stat_3_sub"), Icon: Sparkles },
    { num: t("home.stat_4_num"), label: t("home.stat_4_lbl"), sub: t("home.stat_4_sub"), Icon: Languages },
  ];

  const FEATURES = [
    { Icon: Bot, title: t("landing.feature_ai_title"), desc: t("landing.feature_ai_desc") },
    { Icon: TrendingUp, title: t("landing.feature_market_title"), desc: t("landing.feature_market_desc") },
    { Icon: CloudSun, title: t("landing.feature_weather_title"), desc: t("landing.feature_weather_desc") },
    { Icon: Warehouse, title: t("landing.feature_storage_title"), desc: t("landing.feature_storage_desc") },
    { Icon: ShieldCheck, title: t("landing.feature_risk_title"), desc: t("landing.feature_risk_desc") },
    { Icon: Languages, title: t("landing.feature_lang_title"), desc: t("landing.feature_lang_desc") },
  ];

  const STEPS = [
    { n: "01", Icon: Sprout, title: t("home.step_1_title"), desc: t("home.step_1_desc") },
    { n: "02", Icon: Bot, title: t("home.step_2_title"), desc: t("home.step_2_desc") },
    { n: "03", Icon: MapPin, title: t("home.step_3_title"), desc: t("home.step_3_desc") },
    { n: "04", Icon: CheckCircle2, title: t("home.step_4_title"), desc: t("home.step_4_desc") },
  ];

  const BENEFITS = [
    { title: t("landing.benefit_1_title"), desc: t("landing.benefit_1_desc") },
    { title: t("landing.benefit_2_title"), desc: t("landing.benefit_2_desc") },
    { title: t("landing.benefit_3_title"), desc: t("landing.benefit_3_desc") },
  ];

  const TESTIMONIALS = [1, 2, 3].map((i) => ({
    quote: t(`landing.testimonial_${i}_quote`),
    name: t(`landing.testimonial_${i}_name`),
    role: t(`landing.testimonial_${i}_role`),
  }));

  const heroCta = user
    ? {
        to: user.role === "farmer" ? "/discover" : user.role === "operator" ? "/operator" : "/discover",
        label:
          user.role === "farmer"
            ? t("home.go_to_discover")
            : user.role === "operator"
            ? t("home.go_to_dashboard")
            : t("home.go_to_discover"),
      }
    : null;

  return (
    <div className="overflow-x-hidden">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative border-b border-line bg-gradient-to-b from-accent-pale/50 via-surface to-surface pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "linear-gradient(var(--bd) 1px, transparent 1px)",
            backgroundSize: "100% 34px",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-16 hidden h-64 w-64 rounded-full bg-accent/10 blur-3xl sm:block"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 bottom-0 hidden h-56 w-56 rounded-full bg-brand-harvest/10 blur-3xl sm:block"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        <Container className="relative flex flex-col items-center text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-pale px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              <Sparkles size={13} />
              {t("home.badge")}
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-[2.1rem] font-extrabold leading-[1.12] text-ink sm:text-5xl lg:text-6xl">
              {t("home.hero_title_1")}
              <br />
              <span className="text-accent">{t("home.hero_title_2")}</span>{" "}
              <span className="font-semibold text-ink-muted">{t("home.hero_title_3")}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {t("home.hero_sub")}
            </p>
          </Reveal>

          <Reveal delay={0.24} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {heroCta ? (
              <Button as={Link} to={heroCta.to} size="lg">
                {heroCta.label} <ArrowRight size={16} />
              </Button>
            ) : (
              <>
                <Button as={Link} to="/signup" size="lg">
                  {t("home.get_started_free")} <ArrowRight size={16} />
                </Button>
                <Button as={Link} to="/login" variant="outline" size="lg">
                  {t("auth.sign_in")}
                </Button>
              </>
            )}
          </Reveal>

          <Reveal delay={0.32} className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[t("home.feature_1"), t("home.feature_2"), t("home.feature_3"), t("home.feature_4")].map(
              (f, i) => (
                <span key={i} className="text-xs font-medium text-ink-muted">
                  {f}
                </span>
              )
            )}
          </Reveal>
        </Container>
      </section>

      {/* ══════════════════════ STATS ══════════════════════ */}
      <section className="py-14 sm:py-16">
        <Container>
          <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map(({ num, label, sub, Icon }, i) => (
              <RevealItem key={i}>
                <Card className="flex h-full flex-col items-center gap-2 px-5 py-7 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-pale text-accent">
                    <Icon size={18} />
                  </span>
                  <div className="font-mono text-2xl font-extrabold leading-none text-accent sm:text-[2rem]">
                    {num}
                  </div>
                  <div className="text-sm font-bold text-ink">{label}</div>
                  <div className="text-xs text-ink-muted">{sub}</div>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section className="border-y border-line bg-surface-light py-20">
        <Container>
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={t("landing.features_eyebrow")}
            title={t("landing.features_title")}
            description={t("landing.features_sub")}
          />
          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <RevealItem key={i}>
                <Card hover className="h-full p-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-accent-pale text-accent">
                    <Icon size={20} />
                  </span>
                  <h3 className="mb-1.5 font-display text-base font-semibold text-ink">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{desc}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ══════════════════ AI ADVISOR SPOTLIGHT ══════════════════ */}
      <section className="py-20">
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="slideInLeft">
            <Eyebrow>{t("landing.ai_eyebrow")}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {t("landing.ai_title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{t("landing.ai_desc")}</p>
            <ul className="mt-6 flex flex-col gap-3">
              {[t("landing.ai_point_1"), t("landing.ai_point_2"), t("landing.ai_point_3")].map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent" />
                  {p}
                </li>
              ))}
            </ul>
            <Button as={Link} to="/ml-predict" variant="secondary" className="mt-7">
              {t("landing.ai_cta")} <ArrowRight size={15} />
            </Button>
          </Reveal>

          <Reveal variant="slideInRight" delay={0.1}>
            <Card className="relative overflow-hidden p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-fg">
                  <Bot size={17} />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">{t("landing.ai_eyebrow")}</div>
                  <div className="text-[11px] text-ink-soft">{t("ai_advisor.subtitle")}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  t("ai_advisor.stage_db"),
                  t("ai_advisor.stage_weather"),
                  t("ai_advisor.stage_xgboost"),
                  t("ai_advisor.stage_rag"),
                ].map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-light px-3 py-2 text-xs text-ink-muted"
                  >
                    <Radar size={13} className="shrink-0 text-accent" />
                    {line}
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </Container>
      </section>

      {/* ═══════════════ MARKET + WEATHER SPOTLIGHTS ═══════════════ */}
      <section className="border-y border-line bg-surface-light py-20">
        <Container className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="flex h-full flex-col p-7">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-info-bg text-info">
                <TrendingUp size={20} />
              </span>
              <Eyebrow>{t("landing.market_eyebrow")}</Eyebrow>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">{t("landing.market_title")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("landing.market_desc")}</p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {[t("landing.market_point_1"), t("landing.market_point_2"), t("landing.market_point_3")].map(
                  (p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-info" />
                      {p}
                    </li>
                  )
                )}
              </ul>
              <Button as={Link} to="/market" variant="outline" className="mt-6 self-start">
                {t("landing.market_cta")} <ArrowRight size={15} />
              </Button>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="flex h-full flex-col p-7">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-warn-bg text-warn">
                <CloudSun size={20} />
              </span>
              <Eyebrow>{t("landing.weather_eyebrow")}</Eyebrow>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">{t("landing.weather_title")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("landing.weather_desc")}</p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {[t("landing.weather_point_1"), t("landing.weather_point_2"), t("landing.weather_point_3")].map(
                  (p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-warn" />
                      {p}
                    </li>
                  )
                )}
              </ul>
            </Card>
          </Reveal>
        </Container>
      </section>

      {/* ══════════════════════ MAP SECTION ══════════════════════ */}
      <section className="py-20">
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="slideInLeft" className="order-2 lg:order-1">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-panel border border-line bg-surface-muted">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--bd) 1px, transparent 1px), linear-gradient(90deg, var(--bd) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {[
                { top: "30%", left: "35%", delay: 0 },
                { top: "55%", left: "60%", delay: 0.6 },
                { top: "42%", left: "72%", delay: 1.1 },
                { top: "68%", left: "28%", delay: 1.6 },
              ].map((pin, i) => (
                <motion.span
                  key={i}
                  className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lifted"
                  style={{ top: pin.top, left: pin.left }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: pin.delay }}
                >
                  <Warehouse size={14} />
                </motion.span>
              ))}
            </div>
          </Reveal>

          <Reveal variant="slideInRight" delay={0.1} className="order-1 lg:order-2">
            <Eyebrow>{t("landing.map_eyebrow")}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {t("landing.map_title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">{t("landing.map_desc")}</p>
            <Button as={Link} to="/discover" className="mt-7">
              {t("nav.discover")} <MapPin size={15} />
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section className="border-y border-line bg-surface-light py-20">
        <Container>
          <SectionHeading align="center" className="mx-auto mb-12" title={t("home.how_title")} />
          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
            {STEPS.map(({ n, Icon, title, desc }, i) => (
              <RevealItem key={i}>
                <Card className="relative h-full overflow-hidden p-5">
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-3 select-none font-mono text-6xl font-black text-surface-deep"
                  >
                    {n}
                  </span>
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-md bg-accent-pale text-accent">
                    <Icon size={18} />
                  </span>
                  <h3 className="relative mt-3 text-sm font-bold text-ink">{title}</h3>
                  <p className="relative mt-1.5 text-xs leading-relaxed text-ink-muted">{desc}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ══════════════════════ FARMER BENEFITS ══════════════════════ */}
      <section className="py-20">
        <Container>
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={t("landing.benefits_eyebrow")}
            title={t("landing.benefits_title")}
          />
          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {BENEFITS.map(({ title, desc }, i) => (
              <RevealItem key={i}>
                <Card className="h-full border-t-2 border-t-accent p-6">
                  <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section className="border-y border-line bg-surface-light py-20">
        <Container>
          <SectionHeading
            align="center"
            className="mx-auto mb-12"
            eyebrow={t("landing.testimonials_eyebrow")}
            title={t("landing.testimonials_title")}
          />
          <RevealGroup className="grid grid-cols-1 gap-5 lg:grid-cols-3" stagger={0.08}>
            {TESTIMONIALS.map(({ quote, name, role }, i) => (
              <RevealItem key={i}>
                <Card className="flex h-full flex-col p-6">
                  <Quote size={22} className="mb-3 text-accent/40" />
                  <p className="flex-1 text-sm italic leading-relaxed text-ink">"{quote}"</p>
                  <div className="mt-5 border-t border-line pt-4">
                    <div className="text-sm font-bold text-ink">{name}</div>
                    <div className="text-xs text-ink-muted">{role}</div>
                  </div>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="py-20">
        <Container>
          <Reveal>
            <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-pale to-surface-light px-8 py-14 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg">
                <Sprout size={26} />
              </span>
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{t("home.cta_title")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t("home.cta_sub")}</p>
              <Button as={Link} to="/signup" size="lg" className="mt-7">
                {t("home.cta_btn")}
              </Button>
              <p className="mt-4 text-xs text-ink-soft">{t("landing.final_cta_note")}</p>
            </Card>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
