import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos y condiciones de uso del sitio web y de compra en Macrocell.",
};

export default function TerminosPage() {
  const fecha = "28 de abril de 2026";

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#F5F5F7]">
      <div className="max-w-3xl mx-auto px-5 md:px-0">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <p className="text-xs text-neutral-400 mb-2">Última actualización: {fecha}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">
            Términos y Condiciones de Uso
          </h1>

          <div className="space-y-6 text-neutral-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">1. Aceptación de los términos</h2>
              <p>
                Al acceder y usar el sitio web de <strong>Macrocell</strong>, realizas un
                pedido o creas una cuenta, aceptas estos Términos y Condiciones en su totalidad. Si no
                estás de acuerdo con alguno de ellos, te pedimos que no uses el sitio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">2. Sobre los productos</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Todos los equipos son <strong>100% originales Apple</strong> con número de serie verificable.</li>
                <li>Las condiciones (Nuevo, Exhibición, Open Box, AS-IS, Preventa) están descritas en cada ficha de producto. Lee las diferencias antes de comprar.</li>
                <li>Los precios están expresados en <strong>Pesos Colombianos (COP)</strong> e incluyen IVA cuando aplica.</li>
                <li>Macrocell se reserva el derecho de modificar precios sin previo aviso; el precio que aplica es el vigente al momento de confirmar el pedido.</li>
                <li>La disponibilidad de stock puede cambiar entre el momento en que agregas el producto al carrito y el momento en que confirmas el pago. En caso de agotamiento después de la confirmación, te contactaremos para ofrecer un reemplazo o reembolso.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">3. Proceso de compra</h2>
              <ol className="list-decimal list-inside space-y-1">
                <li>Selecciona el producto y la variante deseada.</li>
                <li>Agrega al carrito y procede al checkout.</li>
                <li>Ingresa tus datos de envío.</li>
                <li>Elige el método de pago: tarjeta/PSE vía Wompi o coordinación por WhatsApp.</li>
                <li>Recibirás confirmación por WhatsApp o al correo registrado.</li>
              </ol>
              <p className="mt-2">
                El contrato de compraventa se perfecciona cuando Macrocell confirma la disponibilidad
                del producto y el pago ha sido verificado.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">4. Métodos de pago</h2>
              <p>
                Aceptamos pagos mediante la plataforma <strong>Wompi</strong> (tarjeta de crédito/débito,
                PSE, Nequi, Daviplata, Bancolombia QR) y transferencias / efectivo coordinados por
                WhatsApp. Macrocell no almacena datos de tarjetas; el procesamiento lo realiza
                Wompi bajo estándares PCI-DSS.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">5. Envíos y entregas</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Enviamos a todo el territorio nacional colombiano.</li>
                <li>Los tiempos estimados son 24 horas para Medellín y área metropolitana; 1–3 días hábiles para el resto del país (sujeto a la transportadora).</li>
                <li>El riesgo de pérdida pasa al comprador una vez el paquete es entregado a la transportadora con guía de envío.</li>
                <li>También puedes recoger tu pedido en cualquiera de nuestras sedes previa confirmación por WhatsApp.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">6. Garantías</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Nuevos / Preventa:</strong> 1 año de garantía Apple.</li>
                <li><strong>Exhibición:</strong> 3.5 meses de garantía Macrocell.</li>
                <li><strong>Open Box:</strong> garantía Apple restante (según fecha de compra original).</li>
                <li><strong>AS-IS:</strong> sin garantía. Se describe el estado al momento de la venta.</li>
              </ul>
              <p className="mt-2">
                La garantía no cubre daños por golpes, humedad, manipulación incorrecta ni modificaciones
                de software no autorizadas.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">7. Derecho de retracto</h2>
              <p>
                De acuerdo con el <strong>Artículo 47 de la Ley 1480 de 2011</strong> (Estatuto del
                Consumidor), tienes <strong>5 días hábiles</strong> después de recibir el producto
                para ejercer el derecho de retracto, siempre que el equipo no haya sido usado y se
                encuentre en su empaque original. Para ejercerlo, contáctanos por WhatsApp o correo.
                Los gastos de devolución corren por cuenta del comprador salvo defecto de fábrica.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">8. Limitación de responsabilidad</h2>
              <p>
                Macrocell no se hace responsable de: (a) interrupciones del servicio por causas ajenas
                a su control (fuerza mayor, fallas de terceros proveedores); (b) daños indirectos,
                pérdida de datos o lucro cesante derivados del uso o imposibilidad de uso del sitio;
                (c) contenido de sitios de terceros a los que se enlace desde este sitio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">9. Propiedad intelectual</h2>
              <p>
                Los nombres, logotipos, imágenes y contenidos del sitio son propiedad de Macrocell o
                de sus proveedores (Apple Inc., entre otros) y están protegidos por las leyes de
                propiedad intelectual. Apple, iPhone, iPad, Apple Watch y MacBook son marcas
                registradas de Apple Inc. Macrocell no es distribuidor oficial de Apple.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">10. Modificaciones</h2>
              <p>
                Macrocell puede actualizar estos términos en cualquier momento. Los cambios entran en
                vigor al ser publicados en el sitio. El uso continuado implica aceptación de los
                términos vigentes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">11. Jurisdicción y ley aplicable</h2>
              <p>
                Estos términos se rigen por las leyes de la <strong>República de Colombia</strong>.
                Cualquier controversia se someterá a los tribunales competentes de la ciudad de
                Medellín, Colombia, salvo que la ley disponga un fuero diferente en favor del
                consumidor.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-2">12. Contacto</h2>
              <p>
                Para dudas sobre estos términos escríbenos a{" "}
                <a href="mailto:hola@macrocell.co" className="text-[#3B9DD8] hover:underline">
                  hola@macrocell.co
                </a>{" "}
                o visita cualquiera de nuestras sedes en Medellín.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-neutral-100 flex flex-wrap gap-4">
            <Link href="/privacidad" className="text-sm text-[#3B9DD8] hover:underline font-medium">
              → Ver política de privacidad
            </Link>
            <Link href="/faqs" className="text-sm text-neutral-500 hover:text-neutral-900">
              → Preguntas frecuentes
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
