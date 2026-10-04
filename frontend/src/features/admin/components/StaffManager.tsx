import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../../api";
import type { Role, User } from "../../../types";
import { ROLE_LABELS } from "../../../lib/roles";
import { initials } from "../../../lib/format";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Skeleton,
  useDialog,
  useToast,
} from "../../../components/ui";
import { IconKey, IconPlus, IconPower } from "../../../components/icons";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** الموظفين: إضافة · إيقاف/تفعيل · تغيير كلمة المرور. */
export function StaffManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");

  const toast = useToast();
  const dialog = useDialog();

  const load = useCallback(async () => {
    try {
      setUsers(await api.getUsers());
    } catch (err) {
      toast.fromError(err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createUser({ name: name.trim(), email: email.trim(), password, role });
      setName("");
      setEmail("");
      setPassword("");
      toast.success("تمت إضافة الموظف");
      await load();
    } catch (err) {
      toast.fromError(err, "فشل إضافة الموظف");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: User) {
    try {
      await api.toggleUser(user.id);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل التحديث");
    }
  }

  async function resetPassword(user: User) {
    const next = await dialog.prompt({
      title: `كلمة مرور جديدة لـ ${user.name}`,
      message: "الموظف هيستخدم الكلمة دي في الدخول من المرة الجاية.",
      label: "كلمة المرور",
      type: "password",
      minLength: 8,
      confirmLabel: "تغيير",
    });
    if (!next) return;
    try {
      await api.resetUserPassword(user.id, next);
      toast.success(`تم تغيير كلمة مرور ${user.name}`);
    } catch (err) {
      toast.fromError(err, "فشل التغيير");
    }
  }

  return (
    <div className="section">
      <Card pad>
        <form
          onSubmit={handleAdd}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="كلمة المرور (8 حروف+)"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select label="الدور" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            icon={<IconPlus size={18} />}
            style={{ justifySelf: "start" }}
          >
            إضافة موظف
          </Button>
        </form>
      </Card>

      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>البريد</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <Skeleton h={30} />
                      </td>
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="u-row">
                          <span className="userchip__avatar userchip__avatar--paper">{initials(u.name)}</span>
                          <span style={{ fontWeight: 700 }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="u-muted" dir="ltr" style={{ textAlign: "start" }}>
                        {u.email}
                      </td>
                      <td>
                        <Badge tone="neutral">{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td>
                        <Badge tone={u.is_active ? "ready" : "cancelled"} dot>
                          {u.is_active ? "نشط" : "موقوف"}
                        </Badge>
                      </td>
                      <td>
                        <div className="table__actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<IconPower size={16} />}
                            onClick={() => toggle(u)}
                          >
                            {u.is_active ? "إيقاف" : "تفعيل"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<IconKey size={16} />}
                            onClick={() => resetPassword(u)}
                          >
                            كلمة المرور
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
