import SwapText from "@/components/SwapText/SwapText";
import Reveal from "@/components/Reveal/Reveal";
import ProjectsGallery, { type ProjectRow } from "./ProjectsGallery";
import projectsData from "@/data/projects.json";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./Projects.module.scss";

type ProjectsDict = Dictionary["projects"];

export default function Projects({ dict }: { dict: ProjectsDict }) {
  // Slugs, marks and URLs are data; outcomes and tags are copy. Joined on slug
  // so the two can be edited independently — the About pattern.
  const rows: ProjectRow[] = projectsData.map((project) => {
    const copy = dict.items[project.slug as keyof ProjectsDict["items"]];
    return { ...project, outcome: copy.outcome, tags: copy.tags };
  });

  return (
    <section id="projects" className={styles.projects}>
      <div className={styles.inner}>
        {/* The label names the section; the heading makes its claim. */}
        <Reveal>
          <span className={styles.label}>
            <SwapText>{dict.title}</SwapText>
          </span>
          <h2 className={styles.heading}>
            <SwapText nowrap={false}>{dict.heading}</SwapText>
          </h2>
        </Reveal>

        <ProjectsGallery rows={rows} />
      </div>
    </section>
  );
}
