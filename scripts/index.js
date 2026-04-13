// Core DOM references used by section navigation.
const pagesContainer = document.getElementById("scroll-pages");
const sections = Array.from(document.querySelectorAll(".page"));
const dots = Array.from(document.querySelectorAll(".dot"));

// Scroll-snap navigation behavior (dot state, click jump, keyboard movement).
if (pagesContainer && sections.length > 0 && dots.length > 0) {
  // Keep side dots in sync with the visible section.
  const setActiveDot = (id) => {
    dots.forEach((dot) => {
      dot.classList.toggle("is-active", dot.dataset.target === id);
    });
  };

  // Observe sections inside the scrolling container and pick the most visible one.
  const observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .slice(0, 1)
        .forEach((entry) => {
          setActiveDot(entry.target.id);
        });
    },
    {
      root: pagesContainer,
      threshold: [0.4, 0.65, 0.85]
    }
  );

  sections.forEach((section) => observer.observe(section));

  // Dot click = smooth scroll to the matching section.
  dots.forEach((dot) => {
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      const targetId = dot.dataset.target;
      const targetSection = sections.find((section) => section.id === targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  window.addEventListener("keydown", (event) => {
    // Restrict behavior to keys people expect for vertical page stepping.
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.key)) {
      return;
    }

    // Identify the currently active section through the active nav dot.
    const currentIndex = sections.findIndex((section) =>
      section.id === dots.find((dot) => dot.classList.contains("is-active"))?.dataset.target
    );

    if (currentIndex < 0) {
      return;
    }

    // Move one section at a time and clamp to the first/last page.
    const nextIndex =
      event.key === "ArrowDown" || event.key === "PageDown"
        ? Math.min(currentIndex + 1, sections.length - 1)
        : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
