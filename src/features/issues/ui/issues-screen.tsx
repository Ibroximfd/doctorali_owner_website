import { IssuesBoard } from "./issues-board";
import { IssuesHero } from "./issues-hero";

/** «Muammolar markazi»: nima buzildi, nima uchun, kim javobgar — va bir bosishda mas'ulga xabar. */
export const IssuesScreen = () => (
  <>
    <IssuesHero />
    <IssuesBoard />
  </>
);
