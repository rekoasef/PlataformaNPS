import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const from = process.env.EMAIL_FROM ?? 'Plataforma NPS <onboarding@resend.dev>'
  const recipients = Array.isArray(to) ? to : [to]

  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    text,
  })

  if (error) throw new Error(error.message)
}
