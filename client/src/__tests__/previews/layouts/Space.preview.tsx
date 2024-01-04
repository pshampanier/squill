import Space from "@/components/spaces/Space";
import PreviewBox from "../PreviewBox";
import Titlebar from "@/components/titlebar/Titlebar";
import Sidebar from "@/components/sidebar/Sidebar";
import Main from "@/components/Main";

export default function SpacePreview() {
  return (
    <PreviewBox className="h-[460px]">
      <div className="w-full min-h-full border border-dashed">
        <Space>
          <Titlebar>titlebar</Titlebar>
          <div className="flex flex-row h-[calc(100%-2.75rem)]">
            <Sidebar>
              <div className="bg-gray-200 p-2 text-gray-500 font-bold">
                <h1>sidebar</h1>
                <p>
                  Morbi venenatis lorem eget ante interdum, luctus facilisis diam elementum. Nullam in pretium mauris.
                  Suspendisse vestibulum arcu ornare tempus ultrices. Aliquam ornare auctor elit non sagittis. Donec
                  condimentum ac quam condimentum sollicitudin. Praesent viverra ornare arcu a mollis. Vivamus maximus,
                  ex in efficitur ultrices, augue mauris viverra nibh, ac vestibulum mi leo eget nisl. Vestibulum sed
                  efficitur tortor. Morbi vel velit a elit pretium euismod. Aenean id pharetra dolor. Nam vel
                  consectetur dolor, sed rutrum tellus. Maecenas ornare, massa tempor posuere molestie, ex lacus dictum
                  nisl, eu pharetra ligula odio a velit. Aenean orci est, interdum nec erat tincidunt, pharetra
                  scelerisque nisl. Curabitur vulputate dignissim magna, eget mattis est auctor vel. Lorem ipsum dolor
                  sit amet, consectetur adipiscing elit. Curabitur pulvinar rhoncus justo in maximus. Donec arcu libero,
                  convallis a libero in, tincidunt congue risus. Mauris vulputate pretium libero, sollicitudin feugiat
                  odio pulvinar non. Praesent venenatis venenatis arcu, at gravida odio suscipit sed. Vestibulum lorem
                  enim, tristique non enim a, pharetra molestie dui. Etiam eu odio urna. Aenean aliquet urna et
                  sollicitudin blandit.
                </p>
              </div>
            </Sidebar>
            <Main>
              <div className="flex flex-auto bg-gray-200 p-2 text-gray-500 font-bold">
                <div>
                  <h1>main</h1>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in nisi metus. Suspendisse fermentum
                    tincidunt tortor, in tincidunt ipsum. Duis dapibus volutpat cursus. Cras iaculis dignissim diam, id
                    egestas tortor scelerisque sed. Duis venenatis est velit, id pulvinar lectus placerat tincidunt.
                    Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Quisque
                    congue diam at lacinia dictum. Nullam congue venenatis arcu eget dignissim. Maecenas semper
                    tincidunt nunc. Integer sollicitudin hendrerit nisl at ullamcorper. Curabitur a efficitur libero.
                    Pellentesque vel tellus eu lacus convallis sollicitudin.
                  </p>
                </div>
              </div>
            </Main>
          </div>
        </Space>
      </div>
    </PreviewBox>
  );
}
