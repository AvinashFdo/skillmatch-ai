import { Fragment } from "react";
import { Link } from "react-router-dom";

const STEPS = [
  { number: 1, label: "Upload", path: "/cv-profile" },
  { number: 2, label: "Skills", path: "/skills" },
  { number: 3, label: "Roles", path: "/roles" },
  { number: 4, label: "Roadmap", path: "/roadmap" },
];

// `current` is the 1-based step number of whichever page is rendering this
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
