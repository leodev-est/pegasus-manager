import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";

const PREFIX = "pegasus:tours";

function getSeenTours(userId: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(`${PREFIX}:${userId}`) ?? "{}");
  } catch {
    return {};
  }
}

function markTourSeen(userId: string, tourId: string) {
  const seen = getSeenTours(userId);
  seen[tourId] = true;
  localStorage.setItem(`${PREFIX}:${userId}`, JSON.stringify(seen));
}

function filterAvailableSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (!step.element) return true;
    if (typeof step.element === "string") {
      return Boolean(document.querySelector(step.element));
    }
    return Boolean(step.element);
  });
}

const DRIVER_LABELS = {
  nextBtnText: "Próximo →",
  prevBtnText: "← Anterior",
  doneBtnText: "✓ Concluir",
};

/**
 * Auto-dispara um tour driver.js na primeira visita do usuário à página.
 * Quando "Tutorial do App" é clicado, o evento 'pegasus:tour:current' reinicia o tour.
 * tourId deve incluir versão, ex: "mensalidades:v1". Incrementar versão força re-exibição.
 */
export function useTour(tourId: string, steps: DriveStep[]) {
  const { user } = useAuth();

  // Refs para sempre ter valores atuais sem recadastrar event listeners
  const userIdRef = useRef<string | undefined>(user?.id);
  const stepsRef = useRef<DriveStep[]>(steps);

  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => { stepsRef.current = steps; });

  const startTourRef = useRef(() => {
    const uid = userIdRef.current;
    const availableSteps = filterAvailableSteps(stepsRef.current);
    if (!uid || availableSteps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      animate: true,
      smoothScroll: true,
      overlayColor: "rgba(0, 0, 30, 0.65)",
      ...DRIVER_LABELS,
      steps: availableSteps,
      onDestroyed: () => markTourSeen(uid, tourId),
    });
    driverObj.drive();
  });

  // Auto-start uma única vez por usuário por tourId
  useEffect(() => {
    if (!user?.id || steps.length === 0) return;
    if (getSeenTours(user.id)[tourId]) return;

    const timer = setTimeout(() => startTourRef.current(), 1200);
    return () => clearTimeout(timer);
  }, [user?.id, tourId, steps.length]);

  // Escuta "Tutorial do App" para reiniciar
  useEffect(() => {
    function handleRestart(e: Event) {
      const detail = (e as CustomEvent<{ handled: boolean }>).detail;
      const availableSteps = filterAvailableSteps(stepsRef.current);
      if (availableSteps.length > 0) {
        if (detail) detail.handled = true;
        startTourRef.current();
      }
    }
    window.addEventListener("pegasus:tour:current", handleRestart);
    return () => window.removeEventListener("pegasus:tour:current", handleRestart);
  }, []);
}
