import { Component, type ErrorInfo, type ReactNode } from "react";
import { BRAND, Logo } from "./brand";
import { IconAlert, IconRefresh } from "./icons";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** بيمنع إن شاشة واحدة تبوّظ الترمينال كله في نص الوردية. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fallback brand-canvas">
        <div className="card card--pad fallback__card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Logo layout="stacked" size="sm" />
          </div>

          <div
            className="modal__icon modal__icon--danger"
            style={{ margin: "0 auto 12px" }}
            aria-hidden="true"
          >
            <IconAlert size={24} />
          </div>

          <h1 style={{ fontSize: "var(--fs-xl)", marginBottom: 8 }}>حصلت مشكلة غير متوقعة</h1>
          <p style={{ color: "var(--text-soft)", fontSize: "var(--fs-sm)", marginBottom: 20 }}>
            {this.state.error.message || "خطأ غير معروف"}
          </p>

          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => window.location.reload()}
          >
            <IconRefresh size={18} />
            إعادة تحميل الصفحة
          </button>

          <div className="fallback__foot">
            <span className="brand-version">
              {BRAND.latin} {BRAND.version}
            </span>
          </div>
        </div>
      </div>
    );
  }
}
