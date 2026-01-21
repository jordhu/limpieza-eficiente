import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Mail, Lock, ArrowRight, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading, signIn, signUp, verifyInvitation } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'invitation' | 'register'>('login');
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/worker');
      }
    }
  }, [user, role, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    
    setLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciales incorrectas');
      } else {
        toast.error('Error al iniciar sesión');
      }
      return;
    }
    
    toast.success('Bienvenido');
  };

  const handleVerifyInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { valid, email: invEmail } = await verifyInvitation(invitationCode.toUpperCase());
    
    setLoading(false);
    
    if (valid && invEmail) {
      setInvitationEmail(invEmail);
      setEmail(invEmail);
      setMode('register');
      toast.success('Código válido. Completa tu registro.');
    } else {
      toast.error('Código inválido o expirado');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);

    const { error } = await signUp(email, password, name);
    
    setLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este correo ya está registrado');
      } else {
        toast.error('Error al registrar: ' + error.message);
      }
      return;
    }
    
    toast.success('Cuenta creada correctamente');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

          {mode !== 'register' && (
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Registrarse
              </button>
              <button
                onClick={() => setMode('invitation')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'invitation'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Invitación
              </button>
            </div>
          )}

          {mode === 'login' && (
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
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Crear Cuenta</h2>
                <p className="text-muted-foreground text-sm">
                  El primer usuario registrado será administrador
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-email"
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
                <Label htmlFor="signup-name">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
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
                    Registrando...
                  </>
                ) : (
                  <>
                    Crear Cuenta
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {mode === 'invitation' && (
            <form onSubmit={handleVerifyInvitation} className="space-y-6">
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

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Completar Registro</h2>
                <p className="text-muted-foreground text-sm">
                  Crea tu cuenta para: <strong>{invitationEmail}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
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
                    Registrando...
                  </>
                ) : (
                  <>
                    Crear Cuenta
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setInvitationEmail('');
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          )}

          {/* Info box */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Información:</p>
            <p className="text-muted-foreground">
              El primer usuario registrado será automáticamente administrador.
            </p>
            <p className="text-muted-foreground">
              Los trabajadores necesitan un código de invitación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
