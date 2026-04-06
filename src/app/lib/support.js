const buyMeACoffeeUrl = process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL?.trim() || "";

export const hasBuyMeACoffeeLink = Boolean(buyMeACoffeeUrl);

export const supportCta = hasBuyMeACoffeeLink
  ? {
      href: buyMeACoffeeUrl,
      label: "Buy me a coffee",
      helperText: "Help keep GitHance public and shipping.",
      isExternal: true,
    }
  : {
      href: "/contribute#support",
      label: "Buy me a coffee",
      helperText: "See how to support the project and the developer behind it.",
      isExternal: false,
    };

export const buyMeACoffeeLink = buyMeACoffeeUrl;
