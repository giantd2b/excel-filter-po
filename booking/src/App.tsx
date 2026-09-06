import { useEffect, useState } from 'react';
import { findPkg, pkgById, type Pkg, type PkgLine } from './data/packages';
import { formForPackage, initialForm, type BookingForm } from './lib/calc';
import { BRAND, SITE_FAMILY, isSiteLine } from './lib/site';
import { getBookingLink, type BookingLinkInfo } from './lib/api';
import { loadPricing } from './lib/pricing';
import Home from './screens/Home';
import Detail from './screens/Detail';
import Wizard from './screens/Wizard';
import Done from './screens/Done';
import QuickBooking from './screens/QuickBooking';
import { PhoneIcon, charm } from './ui';

export interface SavedBooking {
  code: string;
  total: number;
  quotationUrl?: string | null;
  quotationDocNo?: string | null;
  rows: { k: string; v: string }[];
  f: BookingForm;
}

type Screen = 'home' | 'detail' | 'book' | 'quick' | 'done';

/** default package when the wizard is entered from a line tab (same picks the wizard's line toggle makes) */
const PKGS_FIRST: Record<PkgLine, string> = { merit: 'ceremony-prime', buffet: 'buffet-standard', chinese: 'chinese-2300' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [pkgId, setPkgId] = useState(BRAND.defaultPkg);
  const [homeLine, setHomeLine] = useState<PkgLine>(BRAND.defaultLine);
  const [form, setForm] = useState<BookingForm>(() => formForPackage(initialForm, BRAND.defaultPkg));
  // storefront theme + title (the same bundle serves /booking and /catering)
  useEffect(() => {
    document.documentElement.dataset.theme = SITE_FAMILY;
    document.title = BRAND.docTitle;
  }, []);
  const [saved, setSaved] = useState<SavedBooking | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  // Live prices come from the CRM (edited in the dashboard); bump state to re-render once applied
  const [, setPricingVersion] = useState(0);
  useEffect(() => {
    loadPricing().then(() => setPricingVersion((v) => v + 1));
  }, []);

  // /booking/?ref=<token>: a link sales created for one chat customer. Prefill what we know and
  // send the token back on submit so the booking is attributed to that customer/channel/sales.
  const [linkRef] = useState(() => new URLSearchParams(window.location.search).get('ref'));
  const [linkInfo, setLinkInfo] = useState<BookingLinkInfo | null>(null);
  useEffect(() => {
    if (!linkRef) return;
    getBookingLink(linkRef).then((info) => {
      if (!info) return;
      setLinkInfo(info);
      const p = info.preset;
      // findPkg (not pkgById): an id this bundle doesn't know must not silently become PRIME
      const linkPkg = findPkg(info.packageId);
      setForm((f) => {
        const base: BookingForm = {
          ...f,
          name: f.name || info.customerName || '',
          phone: f.phone || info.phone || '',
          ...(p
            ? {
                foodMode: p.foodMode,
                guests: p.guests,
                tables: p.tables,
                monks: p.monks,
                dishCount: p.dishCount ?? f.dishCount,
                selfTransport: p.selfTransport,
                addons: p.addons || [],
                occasion: p.occasion || f.occasion,
                date: p.eventDate || f.date,
                time: p.timeSlot || f.time,
                wantVat: p.wantVat ?? f.wantVat,
              }
            : {}),
        };
        // formForPackage keeps the preset consistent with the package (drops the included drape,
        // other lines' add-ons, forces no monks for catering …)
        return linkPkg ? formForPackage(base, linkPkg.id) : base;
      });
      if (linkPkg) {
        setPkgId(linkPkg.id);
        // a link for a line this storefront doesn't sell (e.g. a โต๊ะจีน preset opened on /booking)
        // still works — the wizard/quick form follow the package — only the home tab stays put
        if (isSiteLine(linkPkg.line)) setHomeLine(linkPkg.line);
      }
      // sales fixed the package: skip straight to the short confirmation form
      if (p) setScreen('quick');
    });
  }, [linkRef]);

  const goHome = () => {
    setScreen('home');
    window.scrollTo(0, 0);
  };

  const showBar = screen === 'home' || screen === 'detail';

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        position: 'relative',
        boxShadow: '0 0 40px rgba(46,43,37,.18)',
        overflow: 'hidden',
      }}
    >
      {/* sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          background: 'var(--color-header-bg)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div
          onClick={goHome}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <div
            style={{
              ...charm,
              width: 38,
              height: 38,
              borderRadius: 999,
              background: 'var(--color-accent-700)',
              color: 'var(--color-logo-text)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 20,
              flex: 'none',
            }}
          >
            {BRAND.mark}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...charm, fontSize: 19, lineHeight: 1.4, color: 'var(--color-accent-800)' }}>{BRAND.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', letterSpacing: '.02em' }}>{BRAND.tagline}</div>
          </div>
        </div>
      </div>

      {linkInfo && screen !== 'done' && (
        <div
          style={{
            margin: '10px 18px 0',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(131,87,204,.10)',
            border: '1px solid rgba(131,87,204,.25)',
            fontSize: 12.5,
            color: 'var(--color-accent-800)',
            lineHeight: 1.5,
          }}
        >
          ลิงก์จองสำหรับ คุณ{linkInfo.customerName} · {linkInfo.channel}
          <span style={{ color: 'var(--color-neutral-600)' }}> — ทีมงานจะติดตามผ่านแชตนี้</span>
        </div>
      )}

      {screen === 'home' && (
        <Home
          line={homeLine}
          onLineChange={setHomeLine}
          onStartBooking={() => {
            // start the wizard on the line the customer was browsing
            if (pkgById(form.pkg).line !== homeLine) setForm(formForPackage(form, PKGS_FIRST[homeLine]));
            setScreen('book');
            window.scrollTo(0, 0);
          }}
          onOpenPkg={(p: Pkg) => {
            setPkgId(p.id);
            setScreen('detail');
            window.scrollTo(0, 0);
          }}
        />
      )}

      {screen === 'detail' && (
        <Detail
          pkg={pkgById(pkgId)}
          onBack={goHome}
          onBook={() => {
            setForm(formForPackage(form, pkgId));
            setScreen('book');
            window.scrollTo(0, 0);
          }}
        />
      )}

      {screen === 'quick' && linkInfo && (
        <QuickBooking
          form={form}
          setForm={setForm}
          linkInfo={linkInfo}
          linkRef={linkRef}
          onEditPackage={() => {
            setWizardStep(1);
            setScreen('book');
            window.scrollTo(0, 0);
          }}
          onDone={(s) => {
            setSaved(s);
            setScreen('done');
            window.scrollTo(0, 0);
          }}
        />
      )}

      {screen === 'book' && (
        <Wizard
          form={form}
          setForm={setForm}
          linkRef={linkRef}
          initialStep={wizardStep}
          onExit={linkInfo?.preset ? () => setScreen('quick') : goHome}
          onDone={(s) => {
            setSaved(s);
            setScreen('done');
            window.scrollTo(0, 0);
          }}
        />
      )}

      {screen === 'done' && saved && <Done saved={saved} onHome={goHome} chatChannel={linkInfo?.channel ?? null} />}

      {/* sticky bottom bar */}
      {showBar && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            display: 'flex',
            gap: 10,
            padding: '12px 18px calc(12px + env(safe-area-inset-bottom))',
            background: 'var(--color-header-bg)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--color-divider)',
          }}
        >
          <a
            href={`tel:${BRAND.phone}`}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 999,
              border: '1.5px solid var(--color-accent-400)',
              color: 'var(--color-accent-700)',
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <PhoneIcon />
            โทรสอบถาม
          </a>
          <a
            href={BRAND.lineUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 999,
              background: '#06c755',
              color: 'var(--color-on-accent)',
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            {BRAND.lineLabel}
          </a>
        </div>
      )}
    </div>
  );
}
