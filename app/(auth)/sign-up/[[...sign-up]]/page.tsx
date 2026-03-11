import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Crie sua conta grátis</h1>
                    <p className="text-white/60 mt-2">30 dias grátis · Sem cartão de crédito</p>
                </div>
                <SignUp
                    path="/sign-up"
                    routing="path"
                    forceRedirectUrl="/dashboard"
                    appearance={{
                        elements: {
                            rootBox: 'w-full',
                            card: 'bg-[#111118] border border-white/10 shadow-2xl',
                            headerTitle: 'text-white',
                            headerSubtitle: 'text-white/60',
                            socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10',
                            dividerLine: 'bg-white/10',
                            dividerText: 'text-white/40',
                            formFieldLabel: 'text-white/70',
                            formFieldInput: 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500',
                            formButtonPrimary: 'bg-blue-600 hover:bg-blue-500',
                            footerActionLink: 'text-blue-400 hover:text-blue-300',
                        },
                    }}
                />
            </div>
        </div>
    )
}
