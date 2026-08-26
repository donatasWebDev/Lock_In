export default {
  providers: [
    {
      domain:
        process.env.CONVEX_SITE_URL ??
        "https://shiny-meerkat-645.eu-west-1.convex.site",
      applicationID: "convex",
    },
  ],
};
