-- Allow a newly registered account to exist before it is bound to a People row.
ALTER TABLE SysUser
  ALTER COLUMN people_id DROP NOT NULL;
