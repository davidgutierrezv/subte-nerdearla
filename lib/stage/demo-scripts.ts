import type { Lang } from '@/lib/schemas'

// Sample talks for the station simulation: exercise the full pipeline without a microphone.
export const DEMO_SCRIPTS: Record<Lang, string[]> = {
  en: [
    'Hi everyone, thanks for coming, and thanks to the organizers for having me here today.',
    'I want to talk about what happens to an open source project once it stops being a side project.',
    'Ten years ago I pushed a small library to GitHub on a Sunday night, and I expected maybe five users.',
    'Today it runs inside thousands of companies, including a few Kubernetes distributions.',
    'The code was never the hard part. The hard part was people, time, and saying no.',
    'So the first lesson is simple: write down how decisions are made before you need it.',
    'A governance document feels bureaucratic until the day two maintainers disagree in public.',
    'The second lesson is about funding. Burnout is not a personal failure, it is a budget problem.',
    'When we joined the CNCF, the biggest change was not money, it was shared infrastructure.',
    'Third lesson: treat your contributors as future maintainers, not as free labor.',
    'Every first pull request is an interview, and you are the one being interviewed.',
    'Let me show you the numbers from our last three years of issues and response times.',
    'Thank you very much. I think we have a few minutes for questions.',
  ],
  es: [
    'Hola a todos, gracias por venir. Hoy quiero contarles cómo llevamos un modelo de lenguaje a producción.',
    'Hacer una demo con un LLM es fácil. Lo difícil empieza cuando lo usa gente real todos los días.',
    'Nuestro primer prototipo tardó una tarde. El sistema que hoy está en producción nos llevó seis meses.',
    'El primer problema fue la latencia. Nadie espera diez segundos para una respuesta en el celular.',
    'Por eso empezamos a transmitir la respuesta por partes, en lugar de esperar el texto completo.',
    'El segundo problema fue la calidad. Sin evaluaciones automáticas, cada cambio era una apuesta.',
    'Armamos un conjunto de doscientas preguntas reales y lo corremos en cada deploy.',
    'Después sumamos RAG para que el modelo responda con nuestros documentos y no invente datos.',
    'Una lección importante: los embeddings no arreglan documentos mal escritos.',
    'También medimos el costo por conversación, porque el éxito puede salir carísimo.',
    'Hoy desplegamos en Vercel y cambiamos de modelo con una sola línea de configuración.',
    'Si se llevan una sola idea, que sea esta: el prototipo es el diez por ciento del trabajo.',
    'Muchas gracias. Si tienen preguntas, las respondo con gusto.',
  ],
}
