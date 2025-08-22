import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useI18n } from '@/contexts/I18nContext';

const fontWeight700 = '700' as const;

const sections = [
  { key: 'intro', title: 'Privacy Policy', },
  { key: 'dataHandling', title: 'Data Handling', },
  { key: 'ai', title: 'Facial Recognition & AI Sims', },
  { key: 'geo', title: 'Geo‑location', },
  { key: 'rights', title: 'Your Rights', },
  { key: 'billing', title: 'Billing & Membership', },
  { key: 'gdpr', title: 'International & GDPR', },
  { key: 'contact', title: 'Contact', },
] as const;

export default function PrivacyScreen() {
  const { t, locale } = useI18n();
  const [webUrl] = useState<string>('https://example.com/privacy');
  const strings = useMemo(() => buildStrings(locale), [locale]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: strings.title }} />
      <ScrollView contentContainerStyle={styles.content} testID="privacy-scroll">
        <Text style={styles.h1}>{strings.title}</Text>
        <Text style={styles.updated}>{strings.updated}</Text>

        <Section title={strings.sections.dataHandling.title}>
          <Text style={styles.p}>{strings.sections.dataHandling.body}</Text>
        </Section>

        <Section title={strings.sections.ai.title}>
          <Text style={styles.p}>{strings.sections.ai.body}</Text>
        </Section>

        <Section title={strings.sections.geo.title}>
          <Text style={styles.p}>{strings.sections.geo.body}</Text>
        </Section>

        <Section title={strings.sections.rights.title}>
          <Text style={styles.p}>{strings.sections.rights.body}</Text>
        </Section>

        <Section title={strings.sections.billing.title}>
          <Text style={styles.p}>{strings.sections.billing.body}</Text>
        </Section>

        <Section title={strings.sections.gdpr.title}>
          <Text style={styles.p}>{strings.sections.gdpr.body}</Text>
        </Section>

        <Section title={strings.sections.contact.title}>
          <Text style={styles.p}>{strings.sections.contact.body}</Text>
        </Section>

        <TouchableOpacity onPress={() => Linking.openURL(webUrl)} style={styles.webBtn} testID="privacy-open-web">
          <Text style={styles.webBtnText}>{strings.viewOnWeb}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function buildStrings(locale: string) {
  return {
    title: locale === 'es' ? 'Política de Privacidad' : locale === 'ja' ? 'プライバシーポリシー' : locale.startsWith('zh') ? '隐私政策' : 'Privacy Policy',
    updated: locale === 'es' ? 'Actualizado: 22 Ago 2025' : locale === 'ja' ? '更新日: 2025年8月22日' : locale.startsWith('zh') ? '更新日期：2025年8月22日' : 'Updated: Aug 22, 2025',
    viewOnWeb: locale === 'es' ? 'Ver versión web' : locale === 'ja' ? 'Web 版を見る' : locale.startsWith('zh') ? '查看网页版' : 'View web version',
    sections: {
      dataHandling: {
        title: locale === 'es' ? 'Gestión de Datos' : locale === 'ja' ? 'データの取り扱い' : locale.startsWith('zh') ? '数据处理' : 'Data Handling',
        body:
          locale === 'es'
            ? 'MatchFlow procesa fotos de verificación facial, contenido de simulaciones de citas con IA y datos de geolocalización para ofrecer funciones clave. Las fotos se procesan localmente siempre que sea posible y se almacenan cifradas cuando el usuario lo consiente. No vendemos datos de usuarios.'
            : locale === 'ja'
            ? 'MatchFlow は本人確認用の顔写真、AI デートシミュレーションの内容、位置情報を主要機能提供のために処理します。可能な限り端末内で処理し、保存が必要な場合はユーザーの同意の上で暗号化保存します。ユーザーデータを販売することはありません。'
            : locale.startsWith('zh')
            ? 'MatchFlow 会处理人脸验证照片、AI 约会模拟内容以及地理位置数据，用于提供核心功能。在可能的情况下，本地处理照片；如需存储，将在用户同意下进行加密存储。我们不会出售用户数据。'
            : 'MatchFlow processes facial verification photos, AI date simulation content, and geo‑location data to provide core features. Photos are processed locally where possible and stored encrypted when users consent. We do not sell user data.',
      },
      ai: {
        title: locale === 'es' ? 'Reconocimiento Facial y Sims de IA' : locale === 'ja' ? '顔認証と AI シミュレーション' : locale.startsWith('zh') ? '人脸识别与 AI 模拟' : 'Facial Recognition & AI Sims',
        body:
          locale === 'es'
            ? 'La verificación requiere 3 fotos en 2 minutos (frente, izquierda, derecha). Usamos detección de rostros y comprobaciones básicas de vitalidad/coherencia. Las simulaciones de IA pueden usar tus fotos y respuestas para generar avatares y diálogos. Puedes optar por no participar en cualquier momento.'
            : locale === 'ja'
            ? '本人確認は 2 分以内に 3 枚（正面・左・右）の撮影が必要です。顔検出と簡易的な生体・一貫性チェックを行います。AI シミュレーションはあなたの写真や回答を用いてアバターや会話を生成する場合があります。いつでもオプトアウトできます。'
            : locale.startsWith('zh')
            ? '验证需在 2 分内拍摄 3 张照片（正面、左侧、右侧）。我们使用人脸检测与基础活体/一致性检查。AI 模拟可能使用你的照片与问卷答案生成头像与对话。你可随时选择退出。'
            : 'Verification requires 3 photos within 2 minutes (front, left, right). We use face detection and basic liveness/consistency checks. AI sims may use your photos and questionnaire to generate avatars and dialogues. You can opt‑out at any time.',
      },
      geo: {
        title: locale === 'es' ? 'Geolocalización' : locale === 'ja' ? '位置情報' : locale.startsWith('zh') ? '地理位置' : 'Geo‑location',
        body:
          locale === 'es'
            ? 'Con tu permiso, usamos ubicación aproximada para descubrir perfiles locales y funciones de geovallas. En web utilizamos la API del navegador.'
            : locale === 'ja'
            ? '許可を得た上で、おおよその位置情報を用いてローカルのプロフィール表示やジオフェンス機能を提供します。Web ではブラウザ API を利用します。'
            : locale.startsWith('zh')
            ? '在你授权的前提下，我们使用近似位置来展示本地资料与地理围栏功能；在 Web 上使用浏览器 API。'
            : 'With your permission, we use approximate location to surface local profiles and geofencing; on web we use the browser API.',
      },
      rights: {
        title: locale === 'es' ? 'Tus Derechos' : locale === 'ja' ? 'あなたの権利' : locale.startsWith('zh') ? '你的权利' : 'Your Rights',
        body:
          locale === 'es'
            ? 'Puedes solicitar acceso, corrección o eliminación de tus datos (incluidas fotos de verificación) vía ajustes o contacto. Responderemos en un plazo razonable.'
            : locale === 'ja'
            ? '設定または問い合わせから、データ（本人確認写真を含む）の開示・訂正・削除をリクエストできます。合理的な期間内に対応します。'
            : locale.startsWith('zh')
            ? '你可以通过设置或联系我们，申请访问、更正或删除你的数据（含验证照片）。我们会在合理期限内响应。'
            : 'You may request access, correction, or deletion of your data (including verification photos) via settings or contact. We will respond within a reasonable timeframe.',
      },
      billing: {
        title: locale === 'es' ? 'Facturación y Membresía' : locale === 'ja' ? '課金とメンバーシップ' : locale.startsWith('zh') ? '计费与会员' : 'Billing & Membership',
        body:
          locale === 'es'
            ? 'Ofrecemos dos niveles: Básico gratis y Premium con suscripción mensual. Los cobros se gestionan por el proveedor elegido (p. ej., PayPal). Puedes cancelar la renovación automática desde la app.'
            : locale === 'ja'
            ? '無料のベーシックと月額制のプレミアムの 2 段階を提供します。請求は選択された決済事業者（例: PayPal）が処理します。自動更新はアプリからいつでも停止できます。'
            : locale.startsWith('zh')
            ? '我们提供两档：免费基础与月度 Premium。费用由所选支付方（如 PayPal）处理。你可在应用内随时取消自动续费。'
            : 'We offer two tiers: free Basic and monthly Premium. Charges are processed by the selected gateway (e.g., PayPal). You can cancel auto‑renew at any time from the app.',
      },
      gdpr: {
        title: locale === 'es' ? 'Usuarios Internacionales y RGPD' : locale === 'ja' ? '海外ユーザーと GDPR' : locale.startsWith('zh') ? '国际用户与 GDPR' : 'International & GDPR',
        body:
          locale === 'es'
            ? 'Para usuarios del EEE/Reino Unido, aplicamos bases legales apropiadas (consentimiento o interés legítimo) y respetamos derechos del RGPD. Puedes presentar una queja ante tu autoridad de control.'
            : locale === 'ja'
            ? 'EEA/英国のユーザーには、適切な法的根拠（同意または正当な利益）に基づいて処理し、GDPR 上の権利を尊重します。監督機関へ苦情を申し立てることもできます。'
            : locale.startsWith('zh')
            ? '对 EEA/英国用户，我们基于适当的法律依据（同意或合法利益）处理，并尊重 GDPR 下的权利。你可向监管机构投诉。'
            : 'For EEA/UK users, we apply appropriate legal bases (consent or legitimate interest) and honor GDPR rights. You may lodge a complaint with your supervisory authority.',
      },
      contact: {
        title: locale === 'es' ? 'Contacto' : locale === 'ja' ? 'お問い合わせ' : locale.startsWith('zh') ? '联系我们' : 'Contact',
        body:
          locale === 'es'
            ? 'Para solicitudes de privacidad o eliminación, contáctanos en privacy@matchflow.app.'
            : locale === 'ja'
            ? 'プライバシーや削除の依頼は privacy@matchflow.app までご連絡ください。'
            : locale.startsWith('zh')
            ? '如需隐私或删除请求，请联系 privacy@matchflow.app。'
            : 'For privacy or deletion requests, contact privacy@matchflow.app.',
      },
    },
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: '#111827' },
  h2: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 18 },
  p: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  updated: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  section: { marginTop: 8 },
  webBtn: { marginTop: 20, alignSelf: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  webBtnText: { color: '#fff', fontWeight: fontWeight700 },
});
