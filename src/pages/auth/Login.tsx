import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate login
    setTimeout(() => {
      setLoading(false);
      
      // Demo: admin@demo.com goes to admin, others go to worker
      if (email === 'admin@demo.com') {
        toast.success('Bienvenido, Administrador');
        navigate('/admin');
      } else {
        toast.success('Bienvenido');
        navigate('/worker');
      }
    }, 1500);
  };

  const handleInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.success('Código válido. Completa tu registro.');
      // Would redirect to registration form
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 sidebar-nav flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-sidebar-foreground">
            CleanTrack
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Control de tiempos
            <br />
            <span className="text-primary">simplificado</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Gestiona los tiempos de trabajo de tu equipo de limpieza con
            geolocalización, códigos QR y reportes en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sidebar-foreground/50 text-sm">
          <span>© 2024 CleanTrack</span>
          <span>•</span>
          <a href="#" className="hover:text-sidebar-foreground transition-colors">
            Privacidad
          </a>
          <span>•</span>
          <a href="#" className="hover:text-sidebar-foreground transition-colors">
            Términos
          </a>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">CleanTrack</span>
          </div>

          {/* Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setIsInvitation(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isInvitation
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsInvitation(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isInvitation
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tengo Invitación
            </button>
          </div>

          {!isInvitation ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                ¿Olvidaste tu contraseña?{' '}
                <a href="#" className="text-primary hover:underline">
                  Recuperar
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleInvitation} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Código de Invitación</h2>
                <p className="text-muted-foreground text-sm">
                  Introduce el código que recibiste para unirte al equipo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-widest"
                  maxLength={14}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Verificar Código
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Demo credentials */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Demo:</p>
            <p className="text-muted-foreground">
              Admin: <code className="bg-muted px-1 rounded">admin@demo.com</code>
            </p>
            <p className="text-muted-foreground">
              Trabajador: <code className="bg-muted px-1 rounded">cualquier email</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
