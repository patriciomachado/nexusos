import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Crie sua conta grátis</h1>
                    <p className="text-white/60 mt-2">30 dias grátis · Sem cartão de crédito</p>
                </div>
                <SignUp />
            </div>
        </div>
    )
}
