import { env } from "@/utils/env";
import { Connection } from "@/models/connections";
import { Driver } from "@/models/drivers";
import { forwardRef } from "react";
import cx from "classix";
import { primary as colors } from "@/utils/colors";
import Input from "@/components/core/Input";
import Switch from "@/components/core/Switch";

type AuthFormProps = {
  name?: string;
  className?: string;
  onChange: (connection: Partial<Connection>) => void;
  driver: Driver;
  connection: Connection;
};

const AuthForm = forwardRef<HTMLFormElement, AuthFormProps>((props, ref) => {
  const { name, className, onChange, driver, connection } = props;
  if (!driver) return null;

  const classes = cx("mx-1 w-full flex flex-col divide space-y-4", colors("divide"), className);
  return (
    <form ref={ref} name={name} className={classes}>
      <div className="flex flex-col gap-4">
        {driver.capabilities.includes("auth_user_password") && (
          <Input
            type="text"
            name="username"
            label="Username"
            defaultValue={connection.username}
            required
            onChange={(e) => onChange({ username: e.target.value })}
          />
        )}
        {(driver.capabilities.includes("auth_user_password") || driver.capabilities.includes("auth_password")) && (
          <>
            <Input
              type="password"
              name="password"
              label="Password"
              defaultValue={connection.password}
              onChange={(e) => onChange({ password: e.target.value })}
            />
            <div className={cx("flex flex-row border-t py-2", colors("border"))}>
              <div className="flex flex-col space-y-1">
                <label htmlFor="save_password">Save password</label>
                <label htmlFor="save_password" className="text-xs">
                  {env.platform === "macos" &&
                    "Your password will be securely stored on your Mac Keychain under your account name."}
                </label>
              </div>
              <div className="flex flex-col ml-auto justify-center">
                <Switch
                  id="save_password"
                  defaultChecked={connection.savePassword}
                  onChange={(e) => onChange({ savePassword: e.target.checked })}
                  disabled={!connection.password}
                />
              </div>
            </div>

            <div className="flex flex-row w-full gap-2"></div>
          </>
        )}
      </div>
    </form>
  );
});

AuthForm.displayName = "AuthForm";
export default AuthForm;
