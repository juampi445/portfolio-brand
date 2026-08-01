import { notFound } from "next/navigation";
import Hero from "@/components/Hero/Hero";
import HeroSecondary from "@/components/HeroSecondary/HeroSecondary";
import ScrollReveal from "@/components/ScrollReveal/ScrollReveal";
import Projects from "@/components/Projects/Projects";
import Services from "@/components/Services/Services";
import About from "@/components/About/About";
import Contact from "@/components/Contact/Contact";
import Footer from "@/components/Footer/Footer";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <>
      <ScrollReveal
        base={<Hero dict={dict.hero} />}
        overlay={<HeroSecondary stages={dict.heroSecondary.stages} />}
      />
      <Projects dict={dict.projects} />
      <Services dict={dict.services} />
      <About dict={dict.about} locale={lang} />
      <Contact dict={dict.contact} />
      <Footer dict={dict} />
    </>
  );
}
