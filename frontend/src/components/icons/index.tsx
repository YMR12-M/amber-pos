import type { ReactNode, SVGProps } from "react";

/**
 * مجموعة أيقونات SVG inline — من غير أي مكتبة خارجية.
 * كلها بترث اللون من `currentColor` والحجم من prop واحد.
 * إضافة أيقونة جديدة = دالة واحدة تحت.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

function Svg({ size = 22, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ------------------------------- التنقل ---------------------------------- */
export const IconRegister = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <path d="M4 11l-1 7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2l-1-7" />
    <path d="M9 15h6" />
  </Svg>
);

export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3.5v17l2.5-1.6L10 20.5l2-1.6 2 1.6 2.5-1.6L19 20.5v-17z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </Svg>
);

export const IconTable = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="8" rx="8" ry="3.6" />
    <path d="M12 11.6V20" />
    <path d="M8 20h8" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0" />
    <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.4" />
    <path d="M17.6 14.4a6.4 6.4 0 0 1 3.6 5.1" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3v16.5a1.5 1.5 0 0 0 1.5 1.5H21" />
    <path d="M7.5 15.5V11M12 15.5V7M16.5 15.5v-3" />
  </Svg>
);

export const IconChef = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 14.5a4.2 4.2 0 1 1 1.6-8.1 4.6 4.6 0 0 1 8.8 0A4.2 4.2 0 1 1 18 14.5z" />
    <path d="M6 14.5V19a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-4.5" />
    <path d="M6 17.5h12" />
  </Svg>
);

export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 13a8 8 0 1 1 16 0" />
    <path d="M12 13l3.5-3.5" />
    <path d="M4 13h2M18 13h2M12 5V3" />
    <path d="M3.5 19.5h17" />
  </Svg>
);

/* ------------------------------- الإجراءات -------------------------------- */
export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5l.8 12.2A1.8 1.8 0 0 0 9.1 20.5h5.8a1.8 1.8 0 0 0 1.8-1.8l.8-12.2" />
    <path d="M10 10.5v6M14 10.5v6" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 12.5l5 5 10-11" /></Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.4l2.8 2.8L16 9.5" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.3v.2" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.7v.2" />
  </Svg>
);

export const IconPrint = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9V3.5h10V9" />
    <path d="M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
    <rect x="7" y="14.5" width="10" height="6" rx="1.2" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
    <path d="M17.5 15.5L21 12l-3.5-3.5" />
    <path d="M21 12H10" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11.5a8 8 0 1 0-1.9 6.4" />
    <path d="M20 5v6.5h-6" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 18}><path d="M6 9.5l6 6 6-6" /></Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.8 8.8 0 1 0 11.1 11.1z" /></Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.4l3.4 2" />
  </Svg>
);

export const IconFire = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.5c3.6 0 6.5-2.7 6.5-6.2 0-4.4-4-6.3-4-10.3-2.2 1-3.4 3-3.4 5.2 0 1-.7 1.8-1.6 1.8-.8 0-1.4-.6-1.6-1.4-1.4 1.4-2.4 3.2-2.4 5.3 0 3.2 2.9 5.6 6.5 5.6z" />
  </Svg>
);

export const IconCash = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 10.2v3.6M18 10.2v3.6" />
  </Svg>
);

export const IconCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
    <path d="M2.5 9.5h19" />
    <path d="M6 14.5h3.5" />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1.5 1.5 0 0 1 1.5 1.5v2" />
    <rect x="3" y="7.5" width="18" height="12" rx="2.4" />
    <path d="M16.5 13.5h1.5" />
  </Svg>
);

export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 8h13l-.9 11.1a1.6 1.6 0 0 1-1.6 1.4H8a1.6 1.6 0 0 1-1.6-1.4z" />
    <path d="M8.8 8V6.2a3.2 3.2 0 0 1 6.4 0V8" />
  </Svg>
);

export const IconBike = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="17" r="3.2" />
    <circle cx="18.5" cy="17" r="3.2" />
    <path d="M8.5 17h6l-2.5-8H9" />
    <path d="M14 9l1.5-4h2.2" />
  </Svg>
);

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 8.2v7.6a1.6 1.6 0 0 1-.85 1.4l-6.9 3.6a1.6 1.6 0 0 1-1.5 0l-6.9-3.6a1.6 1.6 0 0 1-.85-1.4V8.2" />
    <path d="M3.7 7.5l7.55-3.9a1.6 1.6 0 0 1 1.5 0l7.55 3.9-7.55 4a1.6 1.6 0 0 1-1.5 0z" />
    <path d="M12 11.7v8.9" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.6 3.5H19a1.5 1.5 0 0 1 1.5 1.5v7.4a1.6 1.6 0 0 1-.47 1.13l-6.9 6.9a1.6 1.6 0 0 1-2.26 0l-7.3-7.3a1.6 1.6 0 0 1 0-2.26l6.9-6.9a1.6 1.6 0 0 1 1.13-.47z" />
    <path d="M16.2 7.8v.2" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
    <path d="M3.5 7l7.6 5.4a1.6 1.6 0 0 0 1.8 0L20.5 7" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3.2" />
  </Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.7" />
    <path d="M6.3 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.7-.75" />
    <path d="M9.9 9.9a3.2 3.2 0 0 0 4.3 4.3" />
    <path d="M3.5 3.5l17 17" />
  </Svg>
);

export const IconPower = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v8" />
    <path d="M7 6.4a8 8 0 1 0 10 0" />
  </Svg>
);

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="16" r="4" />
    <path d="M10.9 13.1L20 4M17 7l2.5 2.5M14.5 9.5L17 12" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.4a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47.97z" />
  </Svg>
);

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M14.5 5.5l3 3" />
  </Svg>
);

export const IconArchive = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
    <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
    <path d="M10 12.5h4" />
  </Svg>
);

export const IconUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10h10a5 5 0 0 1 0 10h-3" />
    <path d="M7.5 6.5L4 10l3.5 3.5" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 13.5h4l1.2 2.4h6.6l1.2-2.4h4" />
    <path d="M5.6 4.8h12.8a1.6 1.6 0 0 1 1.5 1.06l1.6 6.1v5.5a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-5.5l1.6-6.1a1.6 1.6 0 0 1 1.5-1.06z" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);

/* --------------------------- أيقونة حسب نوع الطلب ------------------------- */
import type { OrderType } from "../../types";

const ORDER_TYPE_ICON: Record<OrderType, (p: IconProps) => JSX.Element> = {
  dine_in: IconTable,
  takeaway: IconBag,
  delivery: IconBike,
};

/** الأيقونة الصح لنوع الطلب — بدل ما كل شاشة تختار بنفسها. */
export function OrderTypeIcon({ type, size = 14 }: { type: OrderType; size?: number }) {
  const Icon = ORDER_TYPE_ICON[type];
  return <Icon size={size} />;
}
