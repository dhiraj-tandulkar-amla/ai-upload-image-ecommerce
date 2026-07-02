import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { search } = await req.json();
    const normalizedSearch = (search || "").toString().trim();

    if (!normalizedSearch) {
      return NextResponse.json(
        { error: "Search text is required" },
        { status: 400 },
      );
    }

    const apiBaseUrl = process.env.ZNODE_API_BASE_URL;
    const portalCode = process.env.ZNODE_PORTAL_CODE;
    const catalogCode = process.env.ZNODE_CATALOG_CODE;
    const storeCode = process.env.ZNODE_STORE_CODE;
    const localeCode = process.env.ZNODE_LOCALE_CODE;
    const rawDomainName = process.env.ZNODE_DOMAIN_NAME;

    if (
      !apiBaseUrl ||
      !portalCode ||
      !catalogCode ||
      !storeCode ||
      !localeCode ||
      !rawDomainName
    ) {
      return NextResponse.json(
        {
          error:
            "Missing ZNode config. Required: ZNODE_API_BASE_URL, ZNODE_PORTAL_CODE, ZNODE_CATALOG_CODE, ZNODE_STORE_CODE, ZNODE_LOCALE_CODE, ZNODE_DOMAIN_NAME",
        },
        { status: 500 },
      );
    }

    const domainName = rawDomainName
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "");

    const query =
      `expand=Promotions,Pricing,AssociatedProducts,Seo,facet,highlights` +
      `&filter=IsGetAllLocationsInventory~eq~false,PortalId~eq~7,IsProductInheritanceEnabled~eq~true` +
      `&pageIndex=1` +
      `&pageSize=12` +
      `&LocaleCode=${encodeURIComponent(localeCode)}` +
      `&CatalogCode=${encodeURIComponent(catalogCode)}` +
      `&storeCode=${encodeURIComponent(storeCode)}` +
      `&IsFacetList=true` +
      `&UseSuggestion=true` +
      `&RefineBy={}` +
      `&IsProductInheritanceEnabled=true`;

    const url = `${apiBaseUrl}/v2.1/search/${encodeURIComponent(normalizedSearch)}/full-text-search?${query}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: process.env.ZNODE_AUTH || "",
        "cache-control": "no-store",
        ...(process.env.ZNODE_CONTEXT
          ? { "z-request-context": process.env.ZNODE_CONTEXT }
          : {}),
        "znode-domainname": domainName,
        "znode-localecode": localeCode,
        "znode-portalcode": portalCode,
        "znode-publishstate": "Production",
      },
    });

    const rawData = await response.json();
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

    if (!response.ok || data?.HasError) {
      console.error("ZNode search failed", {
        url,
        status: response.status,
        statusText: response.statusText,
        errorCode: data?.ErrorCode,
        errorMessage: data?.ErrorMessage,
      });

      return NextResponse.json(
        {
          error: data?.ErrorMessage || "ZNode search failed",
          errorCode: data?.ErrorCode,
          upstreamStatus: response.status,
        },
        { status: response.ok ? 502 : response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Products search route error", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: error?.message || "Failed to fetch products" },
      { status: 500 },
    );
  }
}
