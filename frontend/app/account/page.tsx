"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { fetchValues } from "@/lib/value-cache";
import { TopNav } from "@/components/top-nav";

type ValueOption = { value?: string; label?: string; meta?: any };

type SocialRow = {
  platform: string;
  username: string;
  followers: string;
  url: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [me, setMe] = useState<any>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [statename, setStatename] = useState("");
  const [officename, setOfficename] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [socials, setSocials] = useState<Record<string, SocialRow>>({});

  const [hereToDo, setHereToDo] = useState("");
  const [approxBudget, setApproxBudget] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [brandCategories, setBrandCategories] = useState<string[]>([]);
  const [brandPlatforms, setBrandPlatforms] = useState<string[]>([]);

  const [genderOptions, setGenderOptions] = useState<ValueOption[]>([]);
  const [languageOptions, setLanguageOptions] = useState<ValueOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ValueOption[]>([]);
  const [socialOptions, setSocialOptions] = useState<ValueOption[]>([]);
  const [followerRanges, setFollowerRanges] = useState<ValueOption[]>([]);
  const [brandHereOptions, setBrandHereOptions] = useState<ValueOption[]>([]);
  const [brandBudgetOptions, setBrandBudgetOptions] = useState<ValueOption[]>([]);
  const [brandBusinessOptions, setBrandBusinessOptions] = useState<ValueOption[]>([]);
  const [brandCategoryOptions, setBrandCategoryOptions] = useState<ValueOption[]>([]);
  const [brandPlatformOptions, setBrandPlatformOptions] = useState<ValueOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/api/me");
        if (!active) return;
        setMe(res?.user || null);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load account");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    const profile = me.influencerProfile || {};
    const brand = me.brandProfile || {};
    const location = me.userLocation || {};

    setName(me.name || "");
    setUsername(me.username || "");
    setPhone(me.phone || "");
    setCountryCode(me.countryCode || "");
    setEmail(me.email || "");

    setPincode(location.pincode || "");
    setDistrict(location.district || "");
    setStatename(location.statename || "");
    setOfficename(location.officename || "");
    setFullAddress(location.fullAddress || "");

    setGender(profile.gender || "");
    setDob(profile.dob || "");
    setTitle(profile.title || "");
    setDescription(profile.description || "");
    setLanguages(Array.isArray(profile.languages) ? profile.languages : []);
    setCategories(
      Array.isArray(me.influencerCategories)
        ? me.influencerCategories.map((item: any) => item.key)
        : []
    );

    setHereToDo(brand.hereToDo || "");
    setApproxBudget(brand.approxBudget || "");
    setBusinessType(brand.businessType || "");
    setBrandCategories(
      Array.isArray(me.brandCategories) ? me.brandCategories.map((item: any) => item.key) : []
    );
    setBrandPlatforms(
      Array.isArray(me.brandPlatforms) ? me.brandPlatforms.map((item: any) => item.key) : []
    );

    const initialSocials: Record<string, SocialRow> = {};
    const existing = Array.isArray(me.influencerSocials) ? me.influencerSocials : [];
    existing.forEach((s: any) => {
      if (!s.platform) return;
      initialSocials[String(s.platform).toLowerCase()] = {
        platform: String(s.platform).toLowerCase(),
        username: s.username || "",
        followers: s.followers || "",
        url: s.url || "",
      };
    });
    setSocials(initialSocials);
  }, [me]);

  useEffect(() => {
    if (!me?.role) return;
    let active = true;
    (async () => {
      try {
        if (me.role === "INFLUENCER") {
          const [genders, languages, categories, socials, ranges] = await Promise.all([
            fetchValues("influencer", "gender_options"),
            fetchValues("influencer", "languages"),
            fetchValues("influencer", "categories"),
            fetchValues("influencer", "social_channels"),
            fetchValues("influencer", "follower_ranges"),
          ]);
          if (!active) return;
          setGenderOptions(Array.isArray(genders) ? genders : []);
          setLanguageOptions(Array.isArray(languages) ? languages : []);
          setCategoryOptions(Array.isArray(categories) ? categories : []);
          setSocialOptions(Array.isArray(socials) ? socials : []);
          setFollowerRanges(Array.isArray(ranges) ? ranges : []);
        }

        if (me.role === "BRAND") {
          const [here, budget, business, categories, platforms] = await Promise.all([
            fetchValues("brand", "here_to_do"),
            fetchValues("brand", "approx_budgets"),
            fetchValues("brand", "business_types"),
            fetchValues("brand", "categories"),
            fetchValues("brand", "target_platforms"),
          ]);
          if (!active) return;
          setBrandHereOptions(Array.isArray(here) ? here : []);
          setBrandBudgetOptions(Array.isArray(budget) ? budget : []);
          setBrandBusinessOptions(Array.isArray(business) ? business : []);
          setBrandCategoryOptions(Array.isArray(categories) ? categories : []);
          setBrandPlatformOptions(Array.isArray(platforms) ? platforms : []);
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load values");
      }
    })();
    return () => {
      active = false;
    };
  }, [me?.role]);

  const profileSocials = useMemo(() => {
    const mapped: Record<string, SocialRow> = { ...socials };
    socialOptions.forEach((opt) => {
      const key = String(opt.value || "").toLowerCase();
      if (!key) return;
      if (!mapped[key]) {
        mapped[key] = { platform: key, username: "", followers: "", url: "" };
      }
    });
    return mapped;
  }, [socials, socialOptions]);

  function toggleValue(list: string[], value: string, limit?: number) {
    if (list.includes(value)) {
      return list.filter((item) => item !== value);
    }
    if (limit && list.length >= limit) return list;
    return [...list, value];
  }

  async function saveProfile() {
    setSaved("");
    setError("");
    setSaving(true);
    try {
      const payload: any = {
        user: {
          name,
          username,
          phone,
          countryCode,
        },
        userLocation: {
          pincode,
          district,
          statename,
          officename,
          fullAddress,
        },
      };

      if (me?.role === "INFLUENCER") {
        payload.influencerProfile = {
          gender,
          dob,
          title,
          description,
          languages,
        };
        payload.influencerCategories = categories;
        payload.influencerSocials = Object.values(profileSocials)
          .filter((s) => s.username && s.followers && s.url)
          .map((s) => ({
            platform: s.platform,
            username: s.username,
            followers: s.followers,
            url: s.url,
          }));
      }

      if (me?.role === "BRAND") {
        payload.brandProfile = {
          hereToDo,
          approxBudget,
          businessType,
        };
        payload.brandCategories = brandCategories;
        payload.brandPlatforms = brandPlatforms;
      }

      await apiFetch("/api/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSaved("Profile updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail() {
    if (!email.trim()) return;
    setActionMessage("");
    setChangingEmail(true);
    try {
      await apiFetch("/api/me/change-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setActionMessage("Email updated.");
    } catch (e: any) {
      setActionMessage(e?.message || "Failed to change email");
    } finally {
      setChangingEmail(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return;
    setActionMessage("");
    setChangingPassword(true);
    try {
      await apiFetch("/api/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setActionMessage("Password updated.");
    } catch (e: any) {
      setActionMessage(e?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 py-10 text-sm">Loading account...</div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 py-10 text-sm">Please sign in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <section className="space-y-2">
          <h1 className="text-2xl font-extrabold">Account settings</h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Manage your account, profile, and preferences.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 p-6 dark:border-zinc-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Account info</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400">Basic account details.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Country code</label>
              <input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              Role: <span className="font-semibold">{me.role || "N/A"}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              Email: <span className="font-semibold">{me.email || "N/A"}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              Premium: <span className="font-semibold">{me.isPremium ? "Yes" : "No"}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-6 dark:border-zinc-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Manage account</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Update your email and password.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Change email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
              <button
                onClick={handleChangeEmail}
                disabled={changingEmail}
                className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {changingEmail ? "Updating..." : "Update email"}
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Change password</label>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                placeholder="Current password"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="New password"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {changingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
          {actionMessage ? (
            <p className="text-sm text-emerald-600">{actionMessage}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 p-6 dark:border-zinc-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Edit profile</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Update the same fields from onboarding.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Pincode</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">District</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">State</label>
              <input
                value={statename}
                onChange={(e) => setStatename(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Area / Locality</label>
              <input
                value={officename}
                onChange={(e) => setOfficename(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Full address</label>
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>

          {me.role === "INFLUENCER" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">Select gender</option>
                    {genderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Date of birth</label>
                  <input
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Languages</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {languageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setLanguages((prev) => toggleValue(prev, String(opt.value || "")))
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        languages.includes(String(opt.value || ""))
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
                          : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label || opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Categories</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setCategories((prev) =>
                          toggleValue(prev, String(opt.value || ""), 5)
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        categories.includes(String(opt.value || ""))
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200"
                          : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label || opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Social channels</label>
                <div className="mt-3 space-y-3">
                  {Object.values(profileSocials).map((item) => (
                    <div key={item.platform} className="grid gap-2 md:grid-cols-3">
                      <input
                        value={item.username}
                        onChange={(e) =>
                          setSocials((prev) => ({
                            ...prev,
                            [item.platform]: { ...item, username: e.target.value },
                          }))
                        }
                        placeholder={`${item.platform} username`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      />
                      <select
                        value={item.followers}
                        onChange={(e) =>
                          setSocials((prev) => ({
                            ...prev,
                            [item.platform]: { ...item, followers: e.target.value },
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="">Followers range</option>
                        {followerRanges.map((range) => (
                          <option key={range.value} value={range.value}>
                            {range.label || range.value}
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.url}
                        onChange={(e) =>
                          setSocials((prev) => ({
                            ...prev,
                            [item.platform]: { ...item, url: e.target.value },
                          }))
                        }
                        placeholder="Profile link"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {me.role === "BRAND" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Here to do</label>
                  <select
                    value={hereToDo}
                    onChange={(e) => setHereToDo(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">Select</option>
                    {brandHereOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Approx budget</label>
                  <select
                    value={approxBudget}
                    onChange={(e) => setApproxBudget(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">Select</option>
                    {brandBudgetOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Business type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">Select</option>
                    {brandBusinessOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Categories</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {brandCategoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setBrandCategories((prev) =>
                          toggleValue(prev, String(opt.value || ""), 3)
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        brandCategories.includes(String(opt.value || ""))
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200"
                          : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label || opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Target platforms</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {brandPlatformOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setBrandPlatforms((prev) =>
                          toggleValue(prev, String(opt.value || ""))
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        brandPlatforms.includes(String(opt.value || ""))
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
                          : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label || opt.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-600">{saved}</p> : null}

          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </section>
      </div>
    </div>
  );
}
