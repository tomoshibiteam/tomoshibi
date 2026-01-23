import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email({ message: "有効なメールアドレスを入力してください" }).max(255),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください" }).max(100),
  name: z.string().trim().min(1, { message: "名前を入力してください" }).max(100),
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    if (user) {
      navigate(returnTo);
    }
  }, [user, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const validated = authSchema.parse({ email, password, name });
        const { error } = await signUp(validated.email, validated.password, validated.name);

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "エラー",
              description: "このメールアドレスは既に登録されています",
              variant: "destructive",
            });
          } else if (error.message.includes("Invalid email")) {
            toast({
              title: "エラー",
              description: "有効なメールアドレスを入力してください",
              variant: "destructive",
            });
          } else {
            toast({
              title: "エラー",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Registration succeeded - check if email confirmation is needed
          toast({
            title: "登録完了",
            description: "アカウントが作成されました。確認メールをご確認ください。",
          });
          // Don't navigate immediately - user needs to confirm email first
          // navigate(returnTo);
        }
      } else {
        const validated = authSchema.omit({ name: true }).parse({ email, password });
        const { error } = await signIn(validated.email, validated.password);

        if (error) {
          toast({
            title: "エラー",
            description: "メールアドレスまたはパスワードが正しくありません",
            variant: "destructive",
          });
        } else {
          toast({
            title: "ログイン成功",
            description: "ようこそ！",
          });
          navigate(returnTo);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "入力エラー",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center px-2">
        <Card className="w-full max-w-md border border-[#ebdfcf] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{isSignUp ? "新規登録" : "ログイン"}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isSignUp
                ? "アカウントを作成して探偵活動を始めましょう"
                : "アカウントにログインしてください"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="探偵太郎"
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="detective@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "処理中..." : isSignUp ? "登録する" : "ログイン"}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp
                  ? "既にアカウントをお持ちですか？ログイン"
                  : "アカウントをお持ちでない方は新規登録"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
