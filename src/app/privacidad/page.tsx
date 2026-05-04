import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad y tratamiento de datos personales de Macrocell, conforme a la Ley 1581 de 2012 (Colombia).",
};

export default function PrivacidadPage() {
  const fecha = "28 de abril de 2026";

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#F5F5F7]">
      <div className="max-w-3xl mx-auto px-5 md:px-0">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <p className="text-xs text-neutral-400 mb-2">Última actualización: {fecha}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">
            Política de Privacidad y Tratamiento de Datos Personales
          </h1>

          <div className="prose prose-sm prose-neutral max-w-none space-y-6 text-neutral-700 leading-relaxed">

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">1. Responsable del tratamiento</h2>
              <p>
                <strong>Macrocell</strong> (en adelante «Macrocell»), con establecimientos
                comerciales en el Área Metropolitana de Medellín, es el responsable del tratamiento
                de los datos personales recolectados a través de este sitio web
                (<strong>macrocell.vercel.app</strong>) y de sus canales de atención
                (WhatsApp, Instagram).
              </p>
              <p>
                Contacto del responsable:{" "}
                <a href="mailto:hola@macrocell.co" className="text-[#3B9DD8] hover:underline">
                  hola@macrocell.co
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">2. Marco legal</h2>
              <p>
                Esta política se rige por la{" "}
                <strong>Ley 1581 de 2012</strong> (Protección de Datos Personales) y el{" "}
                <strong>Decreto 1377 de 2013</strong> de la República de Colombia, así como por las
                demás normas que los modifiquen, complementen o sustituyan.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">3. Datos que recolectamos</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Datos de registro:</strong> nombre completo, número de celular, correo electrónico.</li>
                <li><strong>Datos de compra:</strong> dirección de envío, ciudad, departamento, notas del pedido.</li>
                <li><strong>Datos de pago:</strong> Macrocell <em>no</em> almacena información de tarjetas de crédito ni cuentas bancarias; este proceso lo gestiona exclusivamente <strong>Wompi</strong> (Bancolombia S.A.) bajo sus propias políticas de seguridad.</li>
                <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, navegador, páginas visitadas (a través de logs estándar del servidor).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">4. Finalidad del tratamiento</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Procesar y gestionar pedidos de compra.</li>
                <li>Coordinar envíos y entregas a domicilio.</li>
                <li>Brindar soporte postventa y atención al cliente.</li>
                <li>Enviar notificaciones sobre el estado del pedido (WhatsApp).</li>
                <li>Mejorar la experiencia de navegación y el catálogo de productos.</li>
                <li>Cumplir con obligaciones legales (Ley 1480 — Estatuto del Consumidor, normativa tributaria).</li>
              </ul>
              <p className="mt-2 text-sm">
                <strong>No vendemos ni cedemos tus datos a terceros</strong> con fines comerciales o
                publicitarios.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">5. Consentimiento</h2>
              <p>
                Al crear una cuenta, realizar un pedido o proporcionarnos tus datos de contacto,
                otorgas tu consentimiento libre, previo, expreso e informado para el tratamiento
                descrito en esta política. Puedes retirar este consentimiento en cualquier momento
                escribiéndonos al correo indicado en la sección 1.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">6. Derechos del titular</h2>
              <p>Como titular de tus datos tienes derecho a:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Acceso:</strong> conocer qué datos tuyos tratamos.</li>
                <li><strong>Rectificación:</strong> corregir información inexacta o incompleta.</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos cuando no exista obligación legal de conservarlos.</li>
                <li><strong>Portabilidad:</strong> recibir una copia de tus datos en formato legible.</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento para fines distintos a la ejecución de la relación contractual.</li>
              </ul>
              <p className="mt-2 text-sm">
                Para ejercer estos derechos, envía un correo a{" "}
                <a href="mailto:hola@macrocell.co" className="text-[#3B9DD8] hover:underline">
                  hola@macrocell.co
                </a>{" "}
                con el asunto «Derechos ARCO». Respondemos en un plazo máximo de{" "}
                <strong>10 días hábiles</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">7. Seguridad de la información</h2>
              <p>
                Implementamos medidas técnicas y organizativas para proteger tus datos contra acceso
                no autorizado, pérdida o divulgación, incluyendo: cifrado TLS en todas las
                comunicaciones, autenticación segura en nuestra plataforma (Supabase Auth) y acceso
                restringido a los datos por parte del personal autorizado.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">8. Cookies y tecnologías similares</h2>
              <p>
                Utilizamos cookies de sesión estrictamente necesarias para mantener tu carrito y tu
                sesión activa. No usamos cookies de rastreo publicitario de terceros. Puedes
                desactivar las cookies en tu navegador, aunque esto puede afectar la funcionalidad
                del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">9. Transferencia internacional de datos</h2>
              <p>
                Algunos de nuestros proveedores de servicios (Supabase — infraestructura de bases de
                datos; Vercel — hosting) pueden almacenar datos en servidores fuera de Colombia. Estos
                proveedores cuentan con certificaciones de seguridad reconocidas internacionalmente
                (SOC 2, ISO 27001) y están sujetos a acuerdos de procesamiento de datos adecuados.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">10. Cambios a esta política</h2>
              <p>
                Podemos actualizar esta política periódicamente. Notificaremos cambios significativos
                a través del sitio web. El uso continuado del sitio tras la publicación de cambios
                constituye aceptación de la nueva versión.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">11. Autoridad de control</h2>
              <p>
                Si consideras que hemos vulnerado tus derechos, puedes presentar una queja ante la{" "}
                <strong>Superintendencia de Industria y Comercio (SIC)</strong> de Colombia a través
                de{" "}
                <a
                  href="https://www.sic.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B9DD8] hover:underline"
                >
                  www.sic.gov.co
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-neutral-100 flex flex-wrap gap-4">
            <Link href="/terminos" className="text-sm text-[#3B9DD8] hover:underline font-medium">
              → Ver términos de uso
            </Link>
            <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
