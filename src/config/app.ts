export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Creativity.hub";

export const NAV_ITEMS = [
  { href: "/create", label: "create" },
  { href: "/readys", label: "readys" },
  { href: "/cores", label: "cores" },
  { href: "/songs", label: "songs" },
  { href: "/looks", label: "looks" },
] as const;
