"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { useScopedHref } from "@/shared/hooks/use-scope";

type ScopeLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & { href: string };

/** Ichki havola: bo'limdan bo'limga o'tganda tanlangan davr va filial saqlanadi. */
export const ScopeLink = ({ href, ...props }: ScopeLinkProps) => {
  const scopedHref = useScopedHref();
  return <Link href={scopedHref(href)} {...props} />;
};
