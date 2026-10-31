import { SecurityCard } from "./security-card";

/** "Sozlamalar": boshliqning o'z hisobi — xavfsizlik, faol qurilmalar, til va mavzu. */
export const SettingsScreen = ({ twoFactor }: { twoFactor: "sms" | "totp" | null }) => (
  <SecurityCard className="max-w-3xl" twoFactor={twoFactor} />
);
