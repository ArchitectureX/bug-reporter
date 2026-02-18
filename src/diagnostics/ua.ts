export function detectBrowserAndOS(userAgent: string): { browser: string; os: string } {
  let browser = "Unknown";
  let os = "Unknown";

  if (/Edg\//.test(userAgent)) browser = "Edge";
  else if (/Chrome\//.test(userAgent)) browser = "Chrome";
  else if (/Firefox\//.test(userAgent)) browser = "Firefox";
  else if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) browser = "Safari";

  if (/Windows NT/.test(userAgent)) os = "Windows";
  else if (/Mac OS X/.test(userAgent)) os = "macOS";
  else if (/Android/.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(userAgent)) os = "iOS";
  else if (/Linux/.test(userAgent)) os = "Linux";

  return { browser, os };
}
