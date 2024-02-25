import Menu from "@/components/core/Menu";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Button from "@/components/core/Button";

import FavoritesIcon from "@/icons/star.svg?react";

export default function MenuPreview() {
  const handleOnClick = () => {};

  return (
    <>
      <Preview>
        <Preview.Title>Basic</Preview.Title>
        <Preview.Description>
          Menus can have a <b>label</b> and a <b>shortcut</b> for each item. <b>Group</b> can be used to group items.
        </Preview.Description>
        <PreviewBox className="flex text-sm h-52">
          <div className="relative inline-block text-left mx-auto">
            <div>
              <Button text="Menu" variant="outline" />
            </div>
            <Menu className="mt-2">
              <Menu.Group>
                <Menu.Item label="Edit" onClick={handleOnClick} />
                <Menu.Item label="Duplicate" onClick={handleOnClick} />
                <Menu.Item label="Delete" onClick={handleOnClick} />
              </Menu.Group>
            </Menu>
          </div>
        </PreviewBox>
      </Preview>

      <Preview>
        <Preview.Title>Group</Preview.Title>
        <Preview.Description>Groups of menu items are separated by a divider.</Preview.Description>
        <PreviewBox className="flex text-sm h-[330px]">
          <div className="relative inline-block text-left mx-auto">
            <div>
              <Button text="Menu" variant="outline" />
            </div>
            <Menu className="mt-2 absolute right-0 origin-top-right">
              <Menu.Group>
                <Menu.Item label="Edit" onClick={handleOnClick} />
                <Menu.Item label="Duplicate" onClick={handleOnClick} />
                <Menu.Item label="Delete" onClick={handleOnClick} />
              </Menu.Group>
              <Menu.Group>
                <Menu.Item label="Archive" onClick={handleOnClick} />
                <Menu.Item label="Move" onClick={handleOnClick} />
              </Menu.Group>
              <Menu.Group>
                <Menu.Item label="Add to Favorites" disabled />
              </Menu.Group>
            </Menu>
          </div>
        </PreviewBox>
      </Preview>

      <Preview>
        <Preview.Title>Command</Preview.Title>
        <Preview.Description>Menu items can be associated with a command.</Preview.Description>
        <PreviewBox className="flex text-sm h-56">
          <div className="relative inline-block text-left mx-auto">
            <div>
              <Button text="Menu" variant="outline" />
            </div>
            <Menu className="mt-2">
              <Menu.Group>
                <Menu.Item command="clipboard.cut" />
                <Menu.Item command="clipboard.copy" />
                <Menu.Item command="clipboard.paste" />
              </Menu.Group>
            </Menu>
          </div>
        </PreviewBox>
      </Preview>

      <Preview>
        <Preview.Title>Custom</Preview.Title>
        <Preview.Description>Menu items can be customized.</Preview.Description>
        <PreviewBox className="flex text-sm h-56">
          <div className="relative inline-block text-left mx-auto">
            <div>
              <Button text="Menu" variant="outline" />
            </div>
            <Menu className="mt-2">
              <Menu.Group>
                <Menu.Item className="h-[60px]">
                  <img
                    className="flex-shrink-0 object-cover rounded-full w-9 h-9"
                    src="https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?ixid=MnwxMjA3fDB8MHxzZWFyY2h8N3x8d29tYW4lMjBibHVlfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=face&w=500&q=200"
                    alt="jane avatar"
                  />
                  <div className="mx-1 flex flex-col min-w-fit">
                    <h1 className="flex text-sm font-semibold text-gray-700 dark:text-gray-200">Jane Doe</h1>
                    <p className="flex w-64 text-sm text-gray-500 dark:text-gray-400">janedoe@example.com</p>
                  </div>
                </Menu.Item>
              </Menu.Group>
              <Menu.Group>
                <Menu.Item label="Add to Favorites" icon={FavoritesIcon} onClick={handleOnClick} />
              </Menu.Group>
            </Menu>
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
