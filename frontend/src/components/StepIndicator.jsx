import { Fragment } from "react";
import { Link } from "react-router-dom";

const STEPS = [
  { number: 1, label: "Upload", path: "/cv-profile" },
  { number: 2, label: "Skills", path: "/skills" },
  { number: 3, label: "Roles", path: "/roles" },
  { number: 4, label: "Roadmap", path: "/roadmap" },
];

/**
 * Shared 4-step nav shown in the topbar of CV & Profile/Skills/Role
 * Matches/Roadmap - previously hardcoded (3 steps, non-clickable) on
 * CV & Profile only. Now every step is a real link so a user can jump
 * directly between any of the 4 pages instead of only moving forward
 * one page at a time.
 *
 * `current` is the 1-based step number of whichever page is rendering
 * this - that step and every step before it render in the active
 * (blue circle) style; steps after it render in the inactive (grey
 * circle) style, matching the single-step version's existing visual
 * language exactly.
 */
export default function StepIndicator({ current }) {
  return (
    <div className="step-indicator" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map((step, index) => (
        <Fragment key={step.number}>
          <Link
            to={step.path}
            className={`step-indicator-item${step.number <= current ? " step-indicator-item-active" : ""}`}
            aria-current={step.number === current ? "step" : undefined}
          >
            <span className="step-indicator-circle">{step.number}</span>
            <span>{step.label}</span>
          </Link>
          {index < STEPS.length - 1 && <div className="step-indicator-connector" />}
        </Fragment>
      ))}
    </div>
  );
}
