import 'dotenv/config';

const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>QDMS - Kullanım Kılavuzu</title>
<style>
  @page { margin: 20mm 15mm 25mm 15mm; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.7; font-size: 11pt; }
  h1 { color: #0f3460; font-size: 28pt; text-align: center; margin-top: 40px; border-bottom: 3px solid #0f3460; padding-bottom: 10px; }
  h2 { color: #0f3460; font-size: 18pt; margin-top: 35px; border-bottom: 2px solid #e94560; padding-bottom: 6px; page-break-after: avoid; }
  h3 { color: #16213e; font-size: 14pt; margin-top: 20px; page-break-after: avoid; }
  h4 { color: #533483; font-size: 12pt; margin-top: 15px; page-break-after: avoid; }
  .cover { text-align: center; padding: 80px 0 40px 0; page-break-after: always; }
  .cover h1 { font-size: 36pt; border: none; color: #0f3460; }
  .cover .subtitle { font-size: 18pt; color: #555; margin-top: 10px; }
  .cover .version { font-size: 12pt; color: #888; margin-top: 30px; }
  .cover .logo-text { font-size: 48pt; color: #0f3460; font-weight: bold; margin-bottom: 10px; }
  .toc { page-break-after: always; }
  .toc h2 { text-align: center; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 11pt; }
  .toc li span.page { float: right; color: #888; }
  .tip-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
  .tip-box strong { color: #2e7d32; }
  .warning-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
  .warning-box strong { color: #e65100; }
  .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
  .info-box strong { color: #0d47a1; }
  .concept-box { background: #f3e5f5; border-left: 4px solid #9c27b0; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
  .concept-box strong { color: #6a1b9a; }
  .step { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 16px; margin: 10px 0; }
  .step-num { display: inline-block; background: #0f3460; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 10px; font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; font-size: 10pt; }
  td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10pt; }
  tr:nth-child(even) { background: #f5f5f5; }
  .footer { text-align: center; font-size: 9pt; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 5px; }
  .section-intro { font-style: italic; color: #555; margin-bottom: 15px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- KAPAK -->
<div class="cover">
  <div class="logo-text">📋 QDMS</div>
  <h1>Kalite Doküman Yönetim Sistemi</h1>
  <div class="subtitle">Kapsamlı Kullanım Kılavuzu</div>
  <div class="version">
    <br>Sürüm: 2.0<br>
    Tarih: Mart 2026<br>
    <br><br>
    Bu kılavuz, QDMS sisteminin tüm modüllerini<br>
    adım adım anlatmaktadır.<br>
    Teknik bilgi gerektirmez.
  </div>
</div>

<!-- İÇİNDEKİLER -->
<div class="toc">
  <h2>📑 İçindekiler</h2>
  <ul>
    <li><strong>1.</strong> Giriş ve Sisteme Erişim</li>
    <li><strong>2.</strong> Ana Sayfa (Dashboard)</li>
    <li><strong>3.</strong> Doküman Yönetimi</li>
    <li><strong>4.</strong> Müşteri Şikayetleri</li>
    <li><strong>5.</strong> CAPA / DÖF (Düzeltici-Önleyici Faaliyet)</li>
    <li><strong>6.</strong> Toplantı Yönetimi</li>
    <li><strong>7.</strong> Denetim Yönetimi</li>
    <li><strong>8.</strong> Risk Değerlendirmesi</li>
    <li><strong>9.</strong> Ekipman Yönetimi</li>
    <li><strong>10.</strong> Tedarikçi Yönetimi</li>
    <li><strong>11.</strong> İş Sağlığı ve Güvenliği (İSG)</li>
    <li><strong>12.</strong> Ölçüm Yönetimi (KPI)</li>
    <li><strong>13.</strong> Eğitim Yönetimi</li>
    <li><strong>14.</strong> Stratejik Planlama</li>
    <li><strong>15.</strong> Komite Yönetimi</li>
    <li><strong>16.</strong> İnovasyon Yönetimi</li>
    <li><strong>17.</strong> Yönetim Paneli (Admin)</li>
    <li><strong>18.</strong> Teknik Kavramlar Sözlüğü</li>
  </ul>
</div>

<!-- BÖLÜM 1 -->
<h2>1. 🔑 Giriş ve Sisteme Erişim</h2>
<p class="section-intro">QDMS sistemine nasıl giriş yapacağınızı ve temel arayüzü tanıyacaksınız.</p>

<h3>1.1 Sisteme Giriş Yapma</h3>
<div class="step"><span class="step-num">1</span> Web tarayıcınızı açın ve sistem adresinizi yazın.</div>
<div class="step"><span class="step-num">2</span> <strong>Email</strong> alanına kurumsal e-posta adresinizi girin.</div>
<div class="step"><span class="step-num">3</span> <strong>Şifre</strong> alanına size verilen şifreyi girin.</div>
<div class="step"><span class="step-num">4</span> <strong>"Giriş Yap"</strong> butonuna tıklayın.</div>

<div class="tip-box"><strong>💡 İpucu:</strong> Şifrenizi unutursanız sistem yöneticinize başvurun.</div>

<h3>1.2 Arayüz Yapısı</h3>
<p>Giriş yaptıktan sonra karşınıza <strong>Ana Sayfa (Dashboard)</strong> gelir. Ekranın sol tarafında tüm modüllere erişebileceğiniz bir <strong>menü çubuğu</strong> bulunur.</p>
<table>
  <tr><th>Alan</th><th>Açıklama</th></tr>
  <tr><td>Sol Menü</td><td>Tüm modüllere erişim sağlar. Üzerine tıklayarak alt menüleri açabilirsiniz.</td></tr>
  <tr><td>Üst Bar</td><td>Bildirimler (🔔) ve dönem bilgisi görünür.</td></tr>
  <tr><td>Ana İçerik</td><td>Seçtiğiniz modülün içeriği burada görüntülenir.</td></tr>
  <tr><td>Kullanıcı Bilgisi</td><td>Sol menünün altında adınız, rolünüz ve "Çıkış Yap" butonu bulunur.</td></tr>
</table>

<!-- BÖLÜM 2 -->
<h2>2. 🏠 Ana Sayfa (Dashboard)</h2>
<p class="section-intro">Dashboard, tüm modüllerin özet bilgilerini tek ekranda sunar.</p>

<h3>Gösterge Kartları</h3>
<table>
  <tr><th>Kart</th><th>Ne Gösterir?</th></tr>
  <tr><td>Toplam Doküman</td><td>Sistemdeki toplam kontrollü doküman sayısı</td></tr>
  <tr><td>Yayında</td><td>Onaylanmış ve kullanımda olan doküman sayısı</td></tr>
  <tr><td>Bekleyen Onaylar</td><td>Sizin onayınızı bekleyen doküman sayısı</td></tr>
  <tr><td>Toplam Kullanıcı</td><td>Sistemdeki toplam kullanıcı sayısı</td></tr>
</table>

<h3>Grafikler</h3>
<ul>
  <li><strong>Modül Özeti:</strong> Her modüldeki kayıt sayısını gösteren çubuk grafik</li>
  <li><strong>Risk Dağılımı:</strong> Risklerin seviyelerine göre dağılımı (pasta grafik)</li>
  <li><strong>KPI Performansı:</strong> Hedeflere göre KPI durumları</li>
  <li><strong>Şikayet & CAPA Durumu:</strong> Açık/Kapalı dağılımı</li>
  <li><strong>Ekipman Durumu:</strong> Aktif, bakımda, arızalı ekipman dağılımı</li>
</ul>

<!-- BÖLÜM 3 -->
<div class="page-break"></div>
<h2>3. 📄 Doküman Yönetimi</h2>
<p class="section-intro">Kontrollü dokümanların oluşturulması, onaylanması, revizyonu ve arşivlenmesi.</p>

<div class="info-box"><strong>ℹ️ Nedir?</strong> ISO 9001 gibi kalite standartları, tüm prosedür, talimat ve formların kontrollü olmasını gerektirir. Bu modül dokümanlarınızı dijital ortamda yönetmenizi sağlar.</div>

<h3>3.1 Doküman Listesi</h3>
<p>Sol menüden <strong>Dokümanlar → Tüm Dokümanlar</strong> yolunu takip edin. Burada tüm dokümanları listeleyebilir, arayabilir ve filtreleyebilirsiniz.</p>

<h3>3.2 Yeni Doküman Oluşturma</h3>
<div class="step"><span class="step-num">1</span> <strong>"+ Yeni Doküman"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">2</span> Doküman başlığını, türünü (Prosedür, Talimat, Form vb.) ve kategorisini seçin.</div>
<div class="step"><span class="step-num">3</span> Doküman dosyasını yükleyin (PDF, Word, Excel vb.).</div>
<div class="step"><span class="step-num">4</span> İlgili departmanı seçin ve <strong>"Oluştur"</strong> butonuna tıklayın.</div>

<h3>3.3 Doküman Onay Süreci</h3>
<p>Oluşturulan dokümanlar otomatik olarak onay sürecine girer:</p>
<div class="step"><span class="step-num">1</span> Doküman detay sayfasına girin.</div>
<div class="step"><span class="step-num">2</span> <strong>"İncelemeye Gönder"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> İnceleyici kişiyi seçin ve gönderin.</div>
<div class="step"><span class="step-num">4</span> İnceleyici onayladığında doküman "Yayında" durumuna geçer.</div>

<h3>3.4 Klasör Yönetimi</h3>
<p><strong>Dokümanlar → Klasör Yönetimi</strong> sayfasından dokümanlarınızı klasörler halinde organize edebilirsiniz.</p>

<h3>3.5 Onay İş Akışları</h3>
<p><strong>Dokümanlar → Onay İş Akışları</strong> bölümünden çok aşamalı onay süreçleri tanımlayabilirsiniz.</p>

<div class="tip-box"><strong>💡 İpucu:</strong> Doküman önizleme özelliği ile PDF dosyalarını indirmeden tarayıcıda görüntüleyebilirsiniz.</div>

<!-- BÖLÜM 4 -->
<div class="page-break"></div>
<h2>4. 💬 Müşteri Şikayetleri</h2>
<p class="section-intro">Misafir/müşteri şikayetlerinin kaydedilmesi, takibi ve çözüme kavuşturulması.</p>

<h3>4.1 Yeni Şikayet Kaydı</h3>
<div class="step"><span class="step-num">1</span> Sol menüden <strong>"Müşteri Şikayetleri"</strong> tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Şikayet"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Şikayet konusunu, kategorisini, öncelik seviyesini (Düşük/Normal/Yüksek/Acil) belirleyin.</div>
<div class="step"><span class="step-num">4</span> <strong>Misafir Bilgileri</strong> bölümüne adı, e-postası, telefonu girin.</div>
<div class="step"><span class="step-num">5</span> İlgili departman(lar)ı çoklu seçim ile belirleyin.</div>
<div class="step"><span class="step-num">6</span> Gerekiyorsa <strong>"Kanıt Ekle"</strong> bölümünden fotoğraf veya dosya yükleyin.</div>
<div class="step"><span class="step-num">7</span> <strong>"Kaydet"</strong> butonuna tıklayın.</div>

<div class="warning-box"><strong>⚠️ Önemli:</strong> "Yüksek" ve "Acil" öncelikli şikayetler, ilgili departman kullanıcılarına otomatik bildirim gönderir.</div>

<h3>4.2 Şikayet Takibi</h3>
<p>Şikayet listesinde her kaydın durumunu görebilirsiniz: <strong>Yeni → İnceleniyor → Çözümlendi → Kapatıldı</strong></p>
<p>Detay sayfasında sorumlu kişi ataması, görev oluşturma, ilk-ara-son rapor yazma ve durum değişikliği yapabilirsiniz.</p>

<!-- BÖLÜM 5 -->
<div class="page-break"></div>
<h2>5. 🔧 CAPA / DÖF (Düzeltici-Önleyici Faaliyet)</h2>
<p class="section-intro">Uygunsuzluklar için kök neden analizi yapma ve düzeltici/önleyici aksiyonlar planlama.</p>

<div class="concept-box"><strong>📚 CAPA Nedir?</strong><br>
<strong>C</strong>orrective <strong>A</strong>ction / <strong>P</strong>reventive <strong>A</strong>ction anlamına gelir. Türkçe karşılığı <strong>DÖF</strong> (Düzeltici ve Önleyici Faaliyet) olarak bilinir.<br><br>
<strong>Düzeltici Faaliyet:</strong> Mevcut bir sorunu (uygunsuzluk) gidermek ve tekrarını önlemek için yapılan çalışma.<br>
<strong>Önleyici Faaliyet:</strong> Potansiyel bir sorunu daha oluşmadan engellemek için yapılan çalışma.</div>

<h3>5.1 Yeni CAPA Oluşturma</h3>
<div class="step"><span class="step-num">1</span> Sol menüden <strong>"CAPA / DÖF"</strong> tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni CAPA"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> CAPA türünü seçin: Düzeltici, Önleyici veya İyileştirme.</div>
<div class="step"><span class="step-num">4</span> Kaynağı belirtin (Denetim, Şikayet, İç Gözlem vb.).</div>
<div class="step"><span class="step-num">5</span> Sorunu detaylı açıklayın, kök neden analizini yapın.</div>
<div class="step"><span class="step-num">6</span> Aksiyon planlarını ekleyin ve sorumlularını atayın.</div>

<h3>5.2 CAPA Yaşam Döngüsü</h3>
<p><strong>Açık → Analiz → Aksiyon Planı → Uygulama → Doğrulama → Kapatıldı</strong></p>

<!-- BÖLÜM 6 -->
<div class="page-break"></div>
<h2>6. 📅 Toplantı Yönetimi</h2>
<p class="section-intro">Toplantı planlama, katılımcı yönetimi, gündem takibi ve karar kayıtları.</p>

<h3>6.1 Yeni Toplantı Oluşturma</h3>
<div class="step"><span class="step-num">1</span> <strong>Toplantı Yönetimi → Toplantılar</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Toplantı"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Toplantı türünü seçin (Yönetim Gözden Geçirme, Kalite, Komite vb.).</div>
<div class="step"><span class="step-num">4</span> Tarih, saat, salon ve katılımcıları belirleyin.</div>
<div class="step"><span class="step-num">5</span> Gündem maddelerini ekleyin.</div>

<h3>6.2 Gündem Havuzu</h3>
<p><strong>Gündem Havuzu</strong> sayfasından sık kullanılan gündem maddelerini hazır şablon olarak tanımlayabilirsiniz.</p>

<h3>6.3 Toplantı Salonları</h3>
<p><strong>Toplantı Salonları</strong> sayfasından mevcut salon ve kapasitelerini yönetebilirsiniz.</p>

<h3>6.4 Toplantı Detayı</h3>
<p>Toplantıya tıkladığınızda detay sayfasında şunları yapabilirsiniz:</p>
<ul>
  <li>Katılımcıları görüntüleme ve yönetme</li>
  <li>Gündem maddelerini düzenleme</li>
  <li>Toplantı kararlarını kaydetme</li>
  <li>Aksiyon kalemleri oluşturma</li>
  <li>Toplantı dokümanlarını ekleme</li>
</ul>

<!-- BÖLÜM 7 -->
<div class="page-break"></div>
<h2>7. 🔍 Denetim Yönetimi</h2>
<p class="section-intro">İç ve dış denetim süreçlerinin planlanması, yürütülmesi ve bulgularının takibi.</p>

<div class="concept-box"><strong>📚 Denetim (Audit) Nedir?</strong><br>
Denetim, bir kuruluşun süreçlerinin belirlenen standartlara (ISO 9001, ISO 14001 vb.) uygun olup olmadığını bağımsız olarak değerlendirme sürecidir. <strong>İç denetim</strong> kuruluş kendi personeli tarafından, <strong>dış denetim</strong> ise bağımsız kuruluşlar tarafından yapılır.</div>

<h3>7.1 Denetim Planlama</h3>
<div class="step"><span class="step-num">1</span> <strong>"Denetim Yönetimi"</strong> menüsüne tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Denetim"</strong> butonuna basın.</div>
<div class="step"><span class="step-num">3</span> Denetim türü, kapsamı, tarihi ve denetçi ekibini belirleyin.</div>
<div class="step"><span class="step-num">4</span> Denetim kontrol listesi (checklist) oluşturun.</div>

<h3>7.2 Denetim Yürütme ve Bulgu Kayıtları</h3>
<p>Denetim detay sayfasında bulgularınızı kategorize ederek kaydedebilir, fotoğraf ekleyebilir ve CAPA oluşturabilirsiniz.</p>

<!-- BÖLÜM 8 -->
<div class="page-break"></div>
<h2>8. ⚠️ Risk Değerlendirmesi</h2>
<p class="section-intro">Kurumsal risklerin belirlenmesi, değerlendirilmesi ve kontrol altına alınması.</p>

<div class="concept-box"><strong>📚 Risk Değerlendirmesi Nedir?</strong><br>
Risk değerlendirmesi, olası tehlikeleri belirleme, bunların olasılık ve etkisini analiz etme ve kontrol önlemleri planlama sürecidir. <strong>Olasılık × Etki = Risk Seviyesi</strong> formülü kullanılır.</div>

<h3>8.1 Yeni Risk Kaydı</h3>
<div class="step"><span class="step-num">1</span> <strong>"Risk Değerlendirmesi"</strong> menüsüne tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Risk"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Risk tanımını, kategorisini ve ilgili departmanı girin.</div>
<div class="step"><span class="step-num">4</span> Olasılık (1-5) ve Etki (1-5) puanlarını belirleyin.</div>
<div class="step"><span class="step-num">5</span> Risk seviyesi otomatik hesaplanır (Düşük/Orta/Yüksek/Çok Yüksek/Kritik).</div>
<div class="step"><span class="step-num">6</span> Kontrol önlemlerini ve sorumluları belirleyin.</div>

<h3>8.2 Risk Matrisi</h3>
<p>Risk listesi sayfasında risklerin seviyelerine göre renk kodlu dağılımını görebilirsiniz.</p>

<!-- BÖLÜM 9 -->
<div class="page-break"></div>
<h2>9. 🔩 Ekipman Yönetimi</h2>
<p class="section-intro">Tüm ekipmanların kaydı, bakım planlaması ve kalibrasyon takibi.</p>

<h3>9.1 Ekipman Kaydı</h3>
<div class="step"><span class="step-num">1</span> <strong>Ekipman Yönetimi → Tüm Ekipmanlar</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Ekipman"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Ekipman adı, seri no, kategori, departman ve lokasyon bilgilerini girin.</div>
<div class="step"><span class="step-num">4</span> Bakım periyodu ve kalibrasyon bilgilerini tanımlayın.</div>

<h3>9.2 Bakım Yönetimi</h3>
<p>Ekipman detay sayfasında <strong>"Bakım Ekle"</strong> butonuyla periyodik veya arıza bakımı kaydı oluşturabilirsiniz. Bakımı iç personel veya dış firma yapabilir.</p>

<h3>9.3 Kalibrasyon Takibi</h3>
<p><strong>Kalibrasyon Takvimi</strong> sayfasından yaklaşan ve geciken kalibrasyonları takip edebilirsiniz. Üç tür kalibrasyon desteklenir: İç Kalibrasyon, Dış Kalibrasyon ve Doğrulama.</p>

<div class="concept-box"><strong>📚 Kalibrasyon Nedir?</strong><br>
Kalibrasyon, bir ölçüm cihazının doğruluğunu referans standartlarla karşılaştırarak kontrol etme ve gerekiyorsa ayarlama işlemidir. Örneğin bir terazi, termometre veya basınç göstergesi düzenli olarak kalibre edilmelidir.</div>

<!-- BÖLÜM 10 -->
<div class="page-break"></div>
<h2>10. 🚚 Tedarikçi Yönetimi</h2>
<p class="section-intro">Tedarikçilerin kaydı, değerlendirilmesi ve performans takibi.</p>

<h3>10.1 Tedarikçi Kaydı</h3>
<div class="step"><span class="step-num">1</span> <strong>"Tedarikçi Yönetimi"</strong> menüsüne tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Tedarikçi"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Firma bilgilerini (unvan, vergi no, iletişim) girin.</div>
<div class="step"><span class="step-num">4</span> Tedarikçi kategorisini ve durumunu belirleyin.</div>

<h3>10.2 Tedarikçi Değerlendirmesi</h3>
<p>Tedarikçi detay sayfasından periyodik değerlendirme yapabilir, puan verebilir ve geçmiş performansını takip edebilirsiniz.</p>

<!-- BÖLÜM 11 -->
<div class="page-break"></div>
<h2>11. 🦺 İş Sağlığı ve Güvenliği (İSG)</h2>
<p class="section-intro">İSG süreçlerinin yönetimi: kazalar, ramak kalalar, KKD takibi ve acil durum yönetimi.</p>

<h3>11.1 Alt Modüller</h3>
<table>
  <tr><th>Alt Modül</th><th>Açıklama</th></tr>
  <tr><td>Taşeron Firmalar</td><td>Taşeron firma kayıtları ve çalışan takibi</td></tr>
  <tr><td>İş Kazaları</td><td>İş kazası kayıtları, kaza analizi ve aksiyonlar</td></tr>
  <tr><td>Ramak Kala</td><td>Kaza olmadan kıl payı kurtulma olaylarının kaydı</td></tr>
  <tr><td>Risk Değerlendirme</td><td>İSG'ye özgü risk analizleri</td></tr>
  <tr><td>Sağlık Gözetimi</td><td>Çalışan sağlık kayıtları ve aşı takibi</td></tr>
  <tr><td>KKD Takibi</td><td>Kişisel Koruyucu Donanım zimmet ve dağıtım takibi</td></tr>
  <tr><td>Acil Durum Yönetimi</td><td>Acil durum planları ve tatbikat kayıtları</td></tr>
</table>

<div class="concept-box"><strong>📚 KKD Nedir?</strong><br>
<strong>K</strong>işisel <strong>K</strong>oruyucu <strong>D</strong>onanım — Çalışanların güvenliği için kullanılan ekipmanlar: baret, gözlük, eldiven, güvenlik ayakkabısı, kulaklık vb. Her çalışana zimmetlenen KKD'ler bu modülde takip edilir.</div>

<h3>11.2 İş Kazası Kaydı</h3>
<div class="step"><span class="step-num">1</span> <strong>İSG → İş Kazaları</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Kaza Kaydı"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Kaza tarihi, yeri, ilgili kişi ve detayları girin.</div>
<div class="step"><span class="step-num">4</span> Kaza türü ve ciddiyetini belirleyin.</div>
<div class="step"><span class="step-num">5</span> Alınacak aksiyonları planlayın.</div>

<!-- BÖLÜM 12 -->
<div class="page-break"></div>
<h2>12. 📊 Ölçüm Yönetimi (KPI)</h2>
<p class="section-intro">Anahtar Performans Göstergelerinin tanımlanması, ölçülmesi ve hedeflerle karşılaştırılması.</p>

<div class="concept-box"><strong>📚 KPI Nedir?</strong><br>
<strong>K</strong>ey <strong>P</strong>erformance <strong>I</strong>ndicator (Anahtar Performans Göstergesi) — Bir sürecin ne kadar etkili çalıştığını ölçen sayısal göstergedir.<br><br>
<strong>Örnek KPI'lar:</strong><br>
• Müşteri memnuniyet oranı: %92<br>
• Ortalama şikayet çözüm süresi: 3 gün<br>
• Ekipman arıza oranı: %2<br>
• Eğitim tamamlama oranı: %95</div>

<h3>12.1 KPI Tanımlama</h3>
<div class="step"><span class="step-num">1</span> <strong>"Ölçüm Yönetimi (KPI)"</strong> menüsüne tıklayın.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni KPI"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> KPI adı, tipi (Operasyonel/Stratejik/Finansal), birimi ve hedef değerini girin.</div>
<div class="step"><span class="step-num">4</span> Ölçüm periyodunu seçin (Aylık/Çeyreklik/Yıllık).</div>
<div class="step"><span class="step-num">5</span> Uyarı ve kritik eşik değerlerini belirleyin.</div>

<h3>12.2 Ölçüm Girişi</h3>
<p>KPI detay sayfasında <strong>"+ Ölçüm Ekle"</strong> butonuyla periyodik ölçüm değerlerini girebilirsiniz. Sistem, hedefle karşılaştırarak performansı otomatik hesaplar.</p>

<!-- BÖLÜM 13 -->
<div class="page-break"></div>
<h2>13. 🎓 Eğitim Yönetimi</h2>
<p class="section-intro">Eğitim planlaması, katılım takibi ve yetkinlik geliştirme.</p>

<h3>13.1 Eğitim Tanımlama</h3>
<div class="step"><span class="step-num">1</span> <strong>Eğitim Yönetimi → Eğitim Tanımları</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Eğitim"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Eğitim adı, kategorisi, süresi ve eğitmenini belirleyin.</div>

<h3>13.2 Eğitim Planları</h3>
<p><strong>Eğitim Planları</strong> sayfasından yıllık eğitim planlarınızı oluşturabilir, takvime bağlayabilir ve katılımcıları planlayabilirsiniz.</p>

<!-- BÖLÜM 14 -->
<div class="page-break"></div>
<h2>14. 🎯 Stratejik Planlama</h2>
<p class="section-intro">Kurumsal strateji, hedefler, aksiyonlar ve performans karneleri yönetimi.</p>

<div class="concept-box"><strong>📚 Balanced Scorecard (BSC) Nedir?</strong><br>
Balanced Scorecard, kurumsal performansı dört perspektiften değerlendiren bir yönetim aracıdır:<br><br>
<strong>1. Finans:</strong> Gelir artışı, kârlılık, maliyet kontrolü<br>
<strong>2. Müşteri:</strong> Müşteri memnuniyeti, sadakat, pazar payı<br>
<strong>3. İç Süreç:</strong> Operasyonel verimlilik, kalite, inovasyon<br>
<strong>4. Öğrenme & Gelişim:</strong> Çalışan yetkinliği, teknoloji, kültür</div>

<h3>14.1 Strateji Dönemleri</h3>
<div class="step"><span class="step-num">1</span> <strong>Stratejik Planlama → Strateji Dönemleri</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Dönem"</strong> butonuyla stratejik plan dönemi oluşturun.</div>
<div class="step"><span class="step-num">3</span> Dönem adı, başlangıç-bitiş tarihleri, misyon ve vizyonu tanımlayın.</div>
<div class="step"><span class="step-num">4</span> Döneme tıklayarak perspektifler altında stratejik amaç, hedef, alt hedef ve aksiyon ekleyin.</div>

<h3>14.2 Hiyerarşi Yapısı</h3>
<table>
  <tr><th>Seviye</th><th>Açıklama</th><th>Örnek</th></tr>
  <tr><td>Stratejik Amaç</td><td>En üst seviye hedef</td><td>"Müşteri memnuniyetini artırmak"</td></tr>
  <tr><td>Hedef</td><td>Amaçları destekleyen ölçülebilir hedefler</td><td>"NPS skorunu %80'e çıkarmak"</td></tr>
  <tr><td>Alt Hedef</td><td>Hedeflerin alt bileşenleri</td><td>"Online yorum puanını 4.5'e çıkarmak"</td></tr>
  <tr><td>Aksiyon</td><td>Somut yapılacak işler</td><td>"Aylık müşteri anketi uygulamak"</td></tr>
</table>

<h3>14.3 KPI Bağlama</h3>
<p>Her hedefin yanındaki <strong>📊 (grafik) ikonu</strong>na tıklayarak o hedefe KPI bağlayabilirsiniz. Bu sayede hedefin ilerlemesi KPI ölçümleriyle otomatik takip edilir.</p>

<h3>14.4 Risk Bağlama</h3>
<p>Her hedefin yanındaki <strong>⚠️ (uyarı) ikonu</strong>na tıklayarak risk kaydı bağlayabilirsiniz.</p>

<h3>14.5 SWOT Analizi</h3>
<div class="concept-box"><strong>📚 SWOT Analizi Nedir?</strong><br>
SWOT, kuruluşun iç ve dış çevresini değerlendiren stratejik analiz aracıdır:<br><br>
<strong>S — Strengths (Güçlü Yönler):</strong> Kuruluşun rakiplerine göre üstün olduğu alanlar. <em>Örnek: Deneyimli personel, güçlü marka bilinirliği.</em><br><br>
<strong>W — Weaknesses (Zayıf Yönler):</strong> Geliştirilmesi gereken alanlar. <em>Örnek: Eski teknoloji altyapısı, yüksek personel devir oranı.</em><br><br>
<strong>O — Opportunities (Fırsatlar):</strong> Dış çevredeki olumlu gelişmeler. <em>Örnek: Yeni pazar fırsatları, dijitalleşme trendi.</em><br><br>
<strong>T — Threats (Tehditler):</strong> Dış çevredeki olumsuz faktörler. <em>Örnek: Artan rekabet, yasal düzenleme değişiklikleri.</em></div>

<p><strong>Stratejik Planlama → SWOT Analizi</strong> sayfasından kuruluşunuzun SWOT analizini yapabilir, her faktörü etki ve olasılık puanlarıyla değerlendirebilirsiniz.</p>

<h3>14.6 PESTEL Analizi</h3>
<div class="concept-box"><strong>📚 PESTEL Analizi Nedir?</strong><br>
PESTEL, kuruluşun <strong>dış çevresini</strong> altı boyuttan analiz eden stratejik araçtır:<br><br>
<strong>P — Politik:</strong> Hükümet politikaları, siyasi istikrar, vergi düzenlemeleri<br>
<strong>E — Ekonomik:</strong> Enflasyon, döviz kurları, ekonomik büyüme<br>
<strong>S — Sosyal:</strong> Demografik değişimler, tüketici alışkanlıkları, kültürel trendler<br>
<strong>T — Teknolojik:</strong> Yeni teknolojiler, otomasyon, dijitalleşme<br>
<strong>E — Çevresel:</strong> İklim değişikliği, çevre mevzuatı, sürdürülebilirlik<br>
<strong>L — Yasal:</strong> İş hukuku, tüketici hakları, ticaret düzenlemeleri<br><br>
<em>Her faktör için Etki (Düşük/Orta/Yüksek) ve Olasılık değerlendirmesi yapılarak stratejik karar alma süreçlerine veri sağlanır.</em></div>

<p><strong>Stratejik Planlama → PESTEL Analizi</strong> sayfasından dış çevre faktörlerini 6 boyutta tanımlayabilir ve analiz edebilirsiniz.</p>

<h3>14.7 Performans Karneleri</h3>
<p>Departman bazlı performans karneleri oluşturarak KPI'ların ağırlıklı puanlamasını takip edebilirsiniz.</p>

<h3>14.8 Bireysel Karneler</h3>
<p>Çalışan bazında bireysel performans karneleri oluşturabilir, yetkinlik ve KPI değerlendirmelerini birleştirebilirsiniz.</p>

<!-- BÖLÜM 15 -->
<div class="page-break"></div>
<h2>15. 👥 Komite Yönetimi</h2>
<p class="section-intro">Kurumsal komitelerin oluşturulması, üye yönetimi ve toplantı takibi.</p>

<h3>15.1 Komite Oluşturma</h3>
<div class="step"><span class="step-num">1</span> <strong>Komite Yönetimi → Komiteler</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Komite"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Komite adı, türü, başkan ve sekreterini seçin.</div>
<div class="step"><span class="step-num">4</span> Toplantı sıklığını belirleyin (Haftalık/Aylık/Çeyreklik vb.).</div>
<div class="step"><span class="step-num">5</span> Üyeleri ekleyin.</div>

<div class="tip-box"><strong>💡 İpucu:</strong> Komite oluşturulduğunda, belirlenen sıklığa göre otomatik olarak Toplantı Yönetimi modülünde de toplantı kaydı oluşturulur.</div>

<!-- BÖLÜM 16 -->
<div class="page-break"></div>
<h2>16. 💡 İnovasyon Yönetimi</h2>
<p class="section-intro">İnovasyon fikirlerinin toplanması, değerlendirilmesi ve projelere dönüştürülmesi.</p>

<h3>16.1 İnovasyon Fikirleri</h3>
<div class="step"><span class="step-num">1</span> <strong>İnovasyon Yönetimi → İnovasyon Fikirleri</strong> sayfasına gidin.</div>
<div class="step"><span class="step-num">2</span> <strong>"+ Yeni Fikir"</strong> butonuna tıklayın.</div>
<div class="step"><span class="step-num">3</span> Fikir başlığını, açıklamasını ve kategorisini girin.</div>
<div class="step"><span class="step-num">4</span> Beklenen fayda ve kaynak ihtiyacını belirtin.</div>

<h3>16.2 Projeler</h3>
<p>Onaylanan fikirler <strong>Projeler</strong> sayfasında proje olarak takip edilir. Her projede aşama, sorumlu, bütçe ve zaman planı yönetilebilir.</p>

<!-- BÖLÜM 17 -->
<div class="page-break"></div>
<h2>17. ⚙️ Yönetim Paneli (Admin)</h2>
<p class="section-intro">Sistem yönetimi: kullanıcılar, roller, departmanlar ve ayarlar.</p>

<div class="warning-box"><strong>⚠️ Bu bölüm yalnızca Admin ve Yönetici rolündeki kullanıcılar içindir.</strong></div>

<h3>17.1 Kullanıcı Yönetimi</h3>
<p><strong>Yönetim → Kullanıcılar</strong> sayfasından yeni kullanıcı ekleyebilir, mevcut kullanıcıları düzenleyebilir ve rolleri atayabilirsiniz.</p>

<h3>17.2 Rol Yönetimi</h3>
<p><strong>Yönetim → Roller</strong> sayfasından sistem rollerini ve yetkilerini yönetebilirsiniz.</p>
<table>
  <tr><th>Varsayılan Roller</th><th>Yetki Seviyesi</th></tr>
  <tr><td>Admin</td><td>Tüm modüllerde tam yetki</td></tr>
  <tr><td>Yönetici</td><td>Kayıt oluşturma ve düzenleme yetkisi</td></tr>
  <tr><td>Kalite Yöneticisi</td><td>Kalite süreçlerine odaklı yetkiler</td></tr>
  <tr><td>Kullanıcı</td><td>Görüntüleme ve sınırlı düzenleme</td></tr>
</table>

<h3>17.3 Departman Yönetimi</h3>
<p><strong>Yönetim → Departmanlar</strong> sayfasından departman yapısını oluşturabilir ve yönetebilirsiniz.</p>

<h3>17.4 Denetim Geçmişi</h3>
<p><strong>Yönetim → Denetim Geçmişi</strong> sayfasından sistemdeki tüm işlemlerin loglarını görüntüleyebilirsiniz (kim, ne zaman, ne yaptı).</p>

<h3>17.5 Uygulama Ayarları</h3>
<p>Genel sistem ayarlarını (kuruluş adı, logo vb.) bu bölümden yapılandırabilirsiniz.</p>

<!-- BÖLÜM 18 -->
<div class="page-break"></div>
<h2>18. 📖 Teknik Kavramlar Sözlüğü</h2>
<p class="section-intro">QDMS'de karşılaşabileceğiniz teknik terimlerin anlaşılır açıklamaları.</p>

<table>
  <tr><th>Terim</th><th>Açıklama</th></tr>
  <tr><td><strong>ISO 9001</strong></td><td>Kalite Yönetim Sistemi standardı. Kuruluşların süreçlerini sürekli iyileştirmesini sağlar.</td></tr>
  <tr><td><strong>CAPA / DÖF</strong></td><td>Düzeltici ve Önleyici Faaliyet. Sorunların kök nedenini bulup tekrarını önleme süreci.</td></tr>
  <tr><td><strong>KPI</strong></td><td>Anahtar Performans Göstergesi. Süreçlerin etkinliğini ölçen sayısal değerler.</td></tr>
  <tr><td><strong>BSC</strong></td><td>Balanced Scorecard. Performansı 4 perspektiften değerlendiren yönetim aracı.</td></tr>
  <tr><td><strong>SWOT</strong></td><td>Güçlü/Zayıf yönler ve Fırsat/Tehditleri analiz eden strateji aracı.</td></tr>
  <tr><td><strong>PESTEL</strong></td><td>Politik, Ekonomik, Sosyal, Teknolojik, Çevresel ve Yasal dış çevre analizi.</td></tr>
  <tr><td><strong>NPS</strong></td><td>Net Promoter Score — Müşteri sadakatini -100 ile +100 arasında ölçen gösterge.</td></tr>
  <tr><td><strong>Kalibrasyon</strong></td><td>Ölçüm cihazlarının doğruluğunun referans standartlarla kontrol edilmesi.</td></tr>
  <tr><td><strong>KKD</strong></td><td>Kişisel Koruyucu Donanım — Çalışan güvenliği için kullanılan ekipmanlar.</td></tr>
  <tr><td><strong>Uygunsuzluk</strong></td><td>Bir sürecin veya ürünün belirlenen standart veya gereksinimlere uymaması.</td></tr>
  <tr><td><strong>Kök Neden Analizi</strong></td><td>Bir sorunun gerçek nedenini bulmak için kullanılan sistematik teknik (5 Neden, Balık Kılçığı vb.).</td></tr>
  <tr><td><strong>Ramak Kala</strong></td><td>Kaza olmamış ama az kalsın olabilecek tehlikeli durum. Kayıt altına alınarak önlem alınır.</td></tr>
  <tr><td><strong>Perspektif</strong></td><td>BSC'de kullanılan bakış açıları: Finans, Müşteri, İç Süreç, Öğrenme & Gelişim.</td></tr>
  <tr><td><strong>Taslak</strong></td><td>Henüz onaylanmamış, üzerinde çalışılan kayıt durumu.</td></tr>
  <tr><td><strong>Aktif</strong></td><td>Onaylanmış ve kullanımda olan kayıt durumu.</td></tr>
</table>

<div class="footer">
  <p>📋 QDMS - Kalite Doküman Yönetim Sistemi | Kullanım Kılavuzu v2.0 | Mart 2026</p>
  <p>Bu kılavuz, tüm kullanıcılar için hazırlanmıştır. Sorularınız için sistem yöneticinize başvurun.</p>
</div>

</body>
</html>
`;

async function generatePDF() {
  console.log('PDF oluşturma başlıyor...');
  
  // Step 1: Create request
  const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployment_token: process.env.ABACUSAI_API_KEY,
      html_content: htmlContent,
      pdf_options: {
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '25mm', left: '15mm' },
        print_background: true,
        display_header_footer: true,
        footer_template: '<div style="font-size:8px;text-align:center;width:100%;color:#999;">QDMS Kullanım Kılavuzu — Sayfa <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        header_template: '<div style="font-size:1px;"></div>',
      },
    }),
  });

  if (!createResponse.ok) {
    console.error('PDF request failed:', await createResponse.text());
    process.exit(1);
  }

  const { request_id } = await createResponse.json();
  console.log('Request ID:', request_id);

  // Step 2: Poll
  let attempts = 0;
  while (attempts < 300) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
    });
    const statusResult = await statusRes.json();
    const status = statusResult?.status || 'FAILED';
    
    if (status === 'SUCCESS') {
      const result = statusResult?.result;
      if (result?.result) {
        const fs = require('fs');
        const pdfBuffer = Buffer.from(result.result, 'base64');
        const outputPath = '/home/ubuntu/qdms_system/nextjs_space/public/QDMS-Kullanim-Kilavuzu.pdf';
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('PDF başarıyla oluşturuldu:', outputPath);
        console.log('Boyut:', (pdfBuffer.length / 1024).toFixed(1), 'KB');
        return;
      }
    } else if (status === 'FAILED') {
      console.error('PDF oluşturma başarısız:', statusResult?.result?.error);
      process.exit(1);
    }
    
    attempts++;
    if (attempts % 5 === 0) console.log(`Bekleniyor... (${attempts} deneme)`);
  }
  
  console.error('PDF oluşturma zaman aşımına uğradı');
  process.exit(1);
}

generatePDF();
