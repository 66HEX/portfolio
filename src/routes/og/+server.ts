import { homepageContent } from "$lib/content/homepage-content";
import { createOgImage } from "$lib/seo/og-image";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () =>
  createOgImage({
    title: homepageContent.profile.name,
    description: homepageContent.profile.role,
    descriptionLineHeight: 1,
  });
