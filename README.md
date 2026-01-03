📖 Proje Hakkında

KODASISTANIM, sadece kod yazmanızı değil, kodun çalışma mantığıyla etkileşime girmenizi sağlayan üst segment bir IDE simülasyonudur. Monaco Editor altyapısını kullanan bu platform, yazdığınız algoritmayı gerçek zamanlı analiz ederek veri giriş süreçlerini (input handling) birer kullanıcı arayüzü formuna dönüştürür.

✨ Öne Çıkan Özellikler

Dinamik Girdi Analizi (Smart Wizard): Kod içerisinde yer alan Scanner, input(), cin, ReadLine veya fmt.Scan gibi komutları Regex motoruyla anında tespit eder.

Gelişmiş Matris Sihirbazı: Programın 1D, 2D veya 3D matris yapısı beklediğini anlar ve bu verileri girmek için kullanıcıya özel bir tablo arayüzü sunar.

Çok Dilli Derleme (Piston API Integration): Java 15, Python 3.10, NodeJS 18, C#, C++, Go ve TypeScript dillerini doğrudan tarayıcı üzerinde çalıştırır.

Çift Tema Desteği: "Ultimate" (Karanlık/Neon) ve "Kurumsal" (Aydınlık) modlar arasında anlık geçiş imkanı sağlar.

Terminal Simülasyonu: Standart terminal çıktılarının yanı sıra sistem mesajlarını ve hata loglarını (Error/Exit Codes) şık bir arayüzle sunar.

🛠️ Teknik Stack

Core Editor: Monaco Editor (VS Code Engine).

Frontend: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript.

Code Execution: Piston API Integration.

Animations: Canvas-based Matrix Rain & CSS3 Neon Glow Effects.

🚀 Kurulum ve Çalıştırma

Proje herhangi bir bağımlılık yüklemesi gerektirmez (Client-side):

Repoyu klonlayın: git clone https://github.com/umitcancinar/kodasistanim.git

Proje klasörüne gidin: cd kodasistanim

index.html dosyasını favori tarayıcınızla açın.

🧪 Teknik Derin Bakış: Regex Analizi

Sistem, kod içindeki girdi taleplerini aşağıdaki Regex yapısıyla ayrıştırarak dinamik formlar üretir:

JavaScript
const printRegex = /(?:print|Write)(?:ln|f)?\s*\((.*)\)/;
const inputRegex = /(\.next|input\(|ReadLine|cin\s*>>|fmt\.Scan)/;
