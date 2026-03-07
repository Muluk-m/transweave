'use client'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateUserProfile, changePassword } from "@/api/auth";
import { useTranslations } from "next-intl";

interface ProfileFormValues {
  name: string;
  email: string;
  avatar?: string;
}

const profileFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, { message: t('profile.form.validation.nameRequired') }),
  email: z.string().email({ message: t('profile.form.validation.emailInvalid') }),
  avatar: z.string().url({ message: t('profile.form.validation.avatarUrlInvalid') }).optional().or(z.literal(''))
});

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const passwordFormSchema = (t: (key: string) => string) => z.object({
  currentPassword: z.string().min(1, { message: t('profile.password.validation.currentRequired') }),
  newPassword: z.string().min(8, { message: t('profile.password.validation.newMinLength') }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('profile.password.validation.confirmMismatch'),
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const t = useTranslations();

  // Initialize profile form
  const resolve = zodResolver as any;
  const form = useForm<ProfileFormValues>({
    resolver: resolve(profileFormSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      avatar: ""
    }
  });

  // Initialize password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: resolve(passwordFormSchema(t)),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        avatar: user.avatar || ""
      });
    }
  }, [user, form]);

  // Handle profile submit
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await updateUserProfile({
        name: data.name,
        avatar: data.avatar || undefined
      });

      await refreshUser();

      toast({
        title: t('profile.notifications.updateSuccess'),
        description: t('profile.notifications.updateSuccessDesc')
      });
    } catch (error) {
      toast({
        title: t('profile.notifications.updateFailed'),
        description: error instanceof Error ? error.message : "Unable to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle password change
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);

      toast({
        title: t('profile.password.success'),
        description: t('profile.password.successDesc')
      });

      passwordForm.reset();
    } catch (error) {
      toast({
        title: t('profile.password.failed'),
        description: error instanceof Error ? error.message : "Unable to change password",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.notLoggedIn')}</CardTitle>
            <CardDescription>{t('profile.loginRequired')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.href = '/login'}>{t('profile.goToLogin')}</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <Avatar className="h-20 w-20 mr-6">
            <AvatarImage src={user.avatar || "https://github.com/shadcn.png"} />
            <AvatarFallback className="text-lg">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
            <CardDescription>
              {t('profile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.form.username')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.form.email')}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">{t('profile.form.emailReadonly')}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.form.avatar')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('profile.form.avatarPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('profile.form.saving')}
                    </>
                  ) : (
                    t('profile.form.saveChanges')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('profile.password.title')}</CardTitle>
            <CardDescription>
              {t('profile.password.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.password.currentPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.password.newPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.password.confirmPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('profile.password.changing')}
                    </>
                  ) : (
                    t('profile.password.changeButton')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
