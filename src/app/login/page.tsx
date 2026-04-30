import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Plataforma NPS</h1>
            <p className="mt-1 text-sm text-gray-500">Ingresá con tu cuenta de administrador</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
