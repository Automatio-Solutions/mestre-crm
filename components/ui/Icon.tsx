"use client";
import * as React from "react";

type IconName =
  | "home" | "users" | "receipt" | "shopping" | "book" | "landmark" | "chart" | "folder"
  | "search" | "plus" | "chevronDown" | "chevronUp" | "chevronLeft" | "chevronRight"
  | "bell" | "settings" | "more" | "moreV" | "filter" | "download" | "upload" | "close"
  | "check" | "calendar" | "clock" | "flag" | "tag" | "link" | "paperclip" | "message"
  | "activity" | "edit" | "trash" | "arrowUp" | "arrowDown" | "arrowRight" | "trending"
  | "sparkles" | "command" | "sidebar" | "eye" | "fileText" | "grid" | "list" | "columns"
  | "timeline" | "inbox" | "euro" | "wallet" | "creditCard" | "scan" | "lock" | "rocket"
  | "user" | "mail" | "phone" | "pin" | "building" | "dots" | "play"
  | "camera" | "refresh" | "bank" | "truck" | "loader" | "alert" | "x";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName | string;
  size?: number;
  stroke?: number;
}

export function Icon({ name, size = 16, stroke = 1.75, className, style, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    ...rest,
  };
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />,
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    receipt: (
      <>
        <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-4-2Z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </>
    ),
    shopping: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2" />
        <path d="M8 7h8M8 11h8" />
      </>
    ),
    landmark: <path d="M3 22h18M3 10l9-7 9 7M5 10v10M19 10v10M9 10v10M15 10v10" />,
    chart: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" />
        <rect x="12" y="8" width="3" height="10" />
        <rect x="17" y="4" width="3" height="14" />
      </>
    ),
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronUp: <path d="m6 15 6-6 6 6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    moreV: (
      <>
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="19" r="1" />
      </>
    ),
    filter: <path d="M3 4h18l-7 8v6l-4 2v-8Z" />,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />,
    upload: <path d="M12 21V9m0 0 4 4m-4-4-4 4M3 5v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    check: <path d="m5 12 5 5L20 7" />,
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    flag: <path d="M4 21V5s2-2 6-2 6 2 10 2v11c-4 0-6-2-10-2s-6 2-6 2Z" />,
    tag: (
      <>
        <path d="M20 12 12 20 4 12V4h8Z" />
        <circle cx="8" cy="8" r="1.5" />
      </>
    ),
    link: (
      <>
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </>
    ),
    paperclip: <path d="M21 11 12 20a5 5 0 1 1-7-7l9-9a3 3 0 0 1 5 5l-9 9a1 1 0 0 1-1-2l8-8" />,
    message: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />,
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    arrowDown: <path d="M12 5v14M5 12l7 7 7-7" />,
    arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
    trending: (
      <>
        <path d="m23 6-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </>
    ),
    sparkles: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />,
    command: <path d="M9 3a3 3 0 0 0-3 3v3m0 0v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3v-3m-6 0h12m0 0v-3a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3v-3m0 0H6" />,
    sidebar: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </>
    ),
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    columns: (
      <>
        <rect x="3" y="3" width="6" height="18" rx="1" />
        <rect x="11" y="3" width="6" height="18" rx="1" />
        <rect x="19" y="3" width="2" height="18" rx="1" opacity=".5" />
      </>
    ),
    timeline: <path d="M3 6h10M3 12h14M3 18h7" />,
    inbox: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" />
      </>
    ),
    euro: <path d="M18 4a8 8 0 0 0-9 14M18 20a8 8 0 0 1-9-14M4 10h10M4 14h10" />,
    wallet: (
      <>
        <path d="M21 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM18 13h.01" />
        <path d="M21 7V5a2 2 0 0 0-2-2H6" />
      </>
    ),
    creditCard: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    scan: <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />,
    lock: (
      <>
        <rect x="4" y="11" width="16" height="11" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    rocket: (
      <>
        <path d="M5 13c-1 1-2 3-2 5 2 0 4-1 5-2M15 9c1-6 4-7 6-7 0 3-1 5-7 6M19 14c2 0 3-2 3-3M10 5c0-2 2-3 3-3" />
        <path d="m9 11 4 4-2 5-4-4Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 7 10-7" />
      </>
    ),
    phone: <path d="M22 17v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3l2 5-3 2a15 15 0 0 0 7 7l2-3 5 2Z" />,
    pin: (
      <>
        <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <path d="M9 7h2M9 11h2M9 15h2M13 7h2M13 11h2M13 15h2M9 22v-4h6v4" />
      </>
    ),
    dots: (
      <>
        <circle cx="4" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="20" cy="12" r="1.5" />
      </>
    ),
    play: <path d="M7 4v16l13-8Z" />,
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
    bank: <path d="M3 22h18M3 10l9-7 9 7M5 10v10M19 10v10M9 10v10M15 10v10" />,
    truck: (
      <>
        <path d="M1 3h15v13H1Z" />
        <path d="M16 8h4l3 3v5h-7Z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    loader: <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
  };
  if (!paths[name]) return <svg {...common} />;
  return <svg {...common}>{paths[name]}</svg>;
}
