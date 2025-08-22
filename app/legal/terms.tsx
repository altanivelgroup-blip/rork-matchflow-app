import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useI18n } from '@/contexts/I18nContext';

const fontWeight700 = '700' as const;

const sections = [
  { key: 'intro', title: 'Terms of Service' },
  { key: 'accounts', title: 'Accounts' },
  { key: 'billing', title: 'Billing & Subscriptions' },
  { key: 'content', title: 'User Content & Conduct' },
  { key: 'privacy', title: 'Privacy' },
  { key: 'ai', title: 'AI Features' },
  { key: 'geo', title: 'Location Services' },
  { key: 'liability', title: 'Disclaimers & Liability' },
  { key: 'termination', title: 'Termination' },
  { key: 'contact', title: 'Contact' },
] as const;

export default function TermsScreen() {
  const { locale } = useI18n();
  const [webUrl] = useState<string>('https://example.com/terms');
  const strings = useMemo(() => buildStrings(locale), [locale]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: strings.title }} />
      <ScrollView contentContainerStyle={styles.content} testID="terms-scroll">
        <Text style={styles.h1}>{strings.title}</Text>
        <Text style={styles.updated}>{strings.updated}</Text>

        <Section title={strings.sections.accounts.title}>
          <Text style={styles.p}>{strings.sections.accounts.body}</Text>
        </Section>

        <Section title={strings.sections.billing.title}>
          <Text style={styles.p}>{strings.sections.billing.body}</Text>
        </Section>

        <Section title={strings.sections.content.title}>
          <Text style={styles.p}>{strings.sections.content.body}</Text>
        </Section>

        <Section title={strings.sections.privacy.title}>
          <Text style={styles.p}>{strings.sections.privacy.body}</Text>
        </Section>

        <Section title={strings.sections.ai.title}>
          <Text style={styles.p}>{strings.sections.ai.body}</Text>
        </Section>

        <Section title={strings.sections.geo.title}>
          <Text style={styles.p}>{strings.sections.geo.body}</Text>
        </Section>

        <Section title={strings.sections.liability.title}>
          <Text style={styles.p}>{strings.sections.liability.body}</Text>
        </Section>

        <Section title={strings.sections.termination.title}>
          <Text style={styles.p}>{strings.sections.termination.body}</Text>
        </Section>

        <Section title={strings.sections.contact.title}>
          <Text style={styles.p}>{strings.sections.contact.body}</Text>
        </Section>

        <TouchableOpacity onPress={() => Linking.openURL(webUrl)} style={styles.webBtn} testID="terms-open-web">
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
  const isZh = locale.startsWith('zh');
  return {
    title: locale === 'es' ? 'Términos del Servicio' : locale === 'ja' ? '利用規約' : isZh ? '服务条款' : 'Terms of Service',
    updated: locale === 'es' ? 'Actualizado: 22 Ago 2025' : locale === 'ja' ? '更新日: 2025年8月22日' : isZh ? '更新日期：2025年8月22日' : 'Updated: Aug 22, 2025',
    viewOnWeb: locale === 'es' ? 'Ver versión web' : locale === 'ja' ? 'Web 版を見る' : isZh ? '查看网页版' : 'View web version',
    sections: {
      accounts: {
        title: locale === 'es' ? 'Cuentas' : locale === 'ja' ? 'アカウント' : isZh ? '账户' : 'Accounts',
        body:
          locale === 'es'
            ? 'Debes tener 18+ años. Eres responsable de la exactitud de tu información y de mantener la seguridad de tu cuenta.'
            : locale === 'ja'
            ? 'ご利用は 18 歳以上に限ります。登録情報の正確性とアカウントの安全管理はご自身の責任となります。'
            : isZh
            ? '您必须年满 18 周岁。您需对所填信息的准确性与账户安全负责。'
            : 'You must be 18+. You are responsible for the accuracy of your information and keeping your account secure.',
      },
      billing: {
        title: locale === 'es' ? 'Facturación y Suscripciones' : locale === 'ja' ? '課金とサブスクリプション' : isZh ? '计费与订阅' : 'Billing & Subscriptions',
        body:
          locale === 'es'
            ? 'Las suscripciones se renuevan automáticamente hasta cancelación. Los cargos los procesa el proveedor seleccionado (p. ej., PayPal).' 
            : locale === 'ja'
            ? 'サブスクリプションは解約まで自動更新されます。請求は選択した決済事業者（例：PayPal）が処理します。'
            : isZh
            ? '订阅将自动续费，直至取消。费用由所选支付方（如 PayPal）处理。'
            : 'Subscriptions auto‑renew until canceled. Charges are processed by the selected provider (e.g., PayPal).',
      },
      content: {
        title: locale === 'es' ? 'Contenido del Usuarioと行動' : locale === 'ja' ? 'ユーザーコンテンツと行動' : isZh ? '用户内容与行为' : 'User Content & Conduct',
        body:
          locale === 'es'
            ? 'No publiques contenido ilegal, ofensivo o que viole derechos de terceros. Podemos moderar y eliminar contenido.'
            : locale === 'ja'
            ? '違法・攻撃的・第三者の権利を侵害するコンテンツは禁止です。必要に応じてモデレーション・削除を行います。'
            : isZh
            ? '禁止发布违法、冒犯或侵犯他人权利的内容。我们可进行审核与删除。'
            : 'Do not post illegal, offensive, or rights‑infringing content. We may moderate and remove content.',
      },
      privacy: {
        title: locale === 'es' ? 'Privacidad' : locale === 'ja' ? 'プライバシー' : isZh ? '隐私' : 'Privacy',
        body:
          locale === 'es'
            ? 'Nuestras prácticas de datos se describen en la Política de Privacidad. Algunas funciones requieren permisos (cámara, ubicación).'
            : locale === 'ja'
            ? 'データの取り扱いはプライバシーポリシーをご確認ください。機能によっては権限（カメラ・位置情報）が必要です。'
            : isZh
            ? '数据实践见隐私政策。部分功能需要权限（相机、位置）。'
            : 'See our Privacy Policy for data practices. Some features require permissions (camera, location).',
      },
      ai: {
        title: locale === 'es' ? 'Funciones de IA' : locale === 'ja' ? 'AI 機能' : isZh ? 'AI 功能' : 'AI Features',
        body:
          locale === 'es'
            ? 'Las simulaciones de citas con IA y traducciones se proporcionan “tal cual”. Pueden contener errores; no te bases únicamente en ellas para decisiones importantes.'
            : locale === 'ja'
            ? 'AI デートシミュレーションや翻訳は現状有姿で提供され、誤りを含む可能性があります。重要な判断においてのみ依拠しないでください。'
            : isZh
            ? 'AI 约会模拟与翻译按“现状”提供，可能存在错误；请勿仅依赖其作出重要决策。'
            : 'AI date simulations and translations are provided “as is” and may contain errors; do not rely solely on them for important decisions.',
      },
      geo: {
        title: locale === 'es' ? 'Servicios de Ubicación' : locale === 'ja' ? '位置情報サービス' : isZh ? '定位服务' : 'Location Services',
        body:
          locale === 'es'
            ? 'Las funciones locales e internacionales pueden usar tu ubicación aproximada. Puedes desactivar permisos en cualquier momento.'
            : locale === 'ja'
            ? 'ローカル/国際機能では概算位置情報を利用する場合があります。権限はいつでも無効化できます。'
            : isZh
            ? '本地/国际功能可能使用你的近似位置。你可随时关闭权限。'
            : 'Local and international features may use approximate location. You can disable permissions at any time.',
      },
      liability: {
        title: locale === 'es' ? '免責と責任制限' : locale === 'ja' ? '免責と責任制限' : isZh ? '免责声明与责任限制' : 'Disclaimers & Liability',
        body:
          locale === 'es'
            ? 'Hasta el máximo permitido por la ley, no seremos responsables por daños indirectos. El uso es bajo tu propio riesgo.'
            : locale === 'ja'
            ? '法で認められる最大限の範囲で、当社は間接損害について責任を負いません。ご利用は自己責任でお願いします。'
            : isZh
            ? '在法律允许范围内，我们不对任何间接损害负责。使用风险自担。'
            : 'To the fullest extent permitted by law, we are not liable for indirect damages. Use at your own risk.',
      },
      termination: {
        title: locale === 'es' ? '終了' : locale === 'ja' ? '利用終了' : isZh ? '终止' : 'Termination',
        body:
          locale === 'es'
            ? 'Podemos suspender o cancelar cuentas por incumplimiento. Puedes dejar de usar el servicio en cualquier momento.'
            : locale === 'ja'
            ? '規約違反がある場合、アカウントを停止または終了することがあります。いつでも利用を停止できます。'
            : isZh
            ? '若违反条款，我们可暂停或终止账户。你可随时停止使用。'
            : 'We may suspend or terminate accounts for violations. You may stop using the service at any time.',
      },
      contact: {
        title: locale === 'es' ? 'お問い合わせ' : locale === 'ja' ? 'お問い合わせ' : isZh ? '联系我们' : 'Contact',
        body:
          locale === 'es'
            ? 'Consultas legales: legal@matchflow.app.'
            : locale === 'ja'
            ? '法的なお問い合わせ: legal@matchflow.app'
            : isZh
            ? '法律相关咨询：legal@matchflow.app'
            : 'Legal inquiries: legal@matchflow.app.',
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
