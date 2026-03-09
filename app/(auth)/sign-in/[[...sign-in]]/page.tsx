import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
                    <p className="text-white/60 mt-2">Entre na sua conta do Nexus OS</p>
                </div>
                <SignIn
                    path="/sign-in"
                    routing="path"
                    forceRedirectUrl="/dashboard"
                />
            </div>
        </div>
    )
}
