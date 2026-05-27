/** HeroUI Input / Textarea：去掉聚焦阴影与 outline */
export const cleanInputClassNames = {
  inputWrapper: [
    "shadow-none",
    "group-data-[focus=true]:shadow-none",
    "group-data-[focus-visible=true]:ring-0",
    "group-data-[focus-visible=true]:ring-offset-0"
  ],
  input: ["outline-none", "focus:outline-none"]
};
