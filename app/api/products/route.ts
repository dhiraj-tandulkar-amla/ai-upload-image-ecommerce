import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { search } = await req.json();

  const url =
    `https://apigateways-z10-dev4.znodecorp.com/v2.1/search/${search}/full-text-search` +
    `?expand=Promotions,Pricing,AssociatedProducts,Seo,facet,highlights` +
    `&filter=IsGetAllLocationsInventory~eq~false,PortalId~eq~7,IsProductInheritanceEnabled~eq~true` +
    `&pageIndex=1` +
    `&pageSize=12` +
    `&LocaleCode=en-US` +
    `&CatalogCode=MaxwellsHardware` +
    `&storeCode=MaxwellsHardware` +
    `&IsFacetList=true` +
    `&UseSuggestion=true` +
    `&RefineBy={}` +
    `&IsProductInheritanceEnabled=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",

      authorization: process.env.ZNODE_AUTH!,

      "cache-control": "no-store",

      "z-request-context": process.env.ZNODE_CONTEXT!,

      "znode-domainname": "localhost:3000",

      "znode-localecode": "en-US",

      "znode-portalcode": "MaxwellsHardware",

      "znode-publishstate": "Production",
    },
  });

  const data = await response.json();

  return NextResponse.json(data);
}
