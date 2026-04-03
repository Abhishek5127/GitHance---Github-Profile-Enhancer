export function buildAuthRedirectHref(callbackUrl = "/profile-builder", extraParams = {}) {
  const params = new URLSearchParams();

  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    const normalizedValue = String(value ?? "").trim();
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });

  const query = params.toString();
  return query ? "/auth?" + query : "/auth";
}

export function openAuthRedirect(callbackUrl = "/profile-builder", extraParams = {}) {
  const href = buildAuthRedirectHref(callbackUrl, extraParams);

  if (typeof window !== "undefined") {
    window.location.assign(href);
  }

  return href;
}
