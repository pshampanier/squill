import Timeline from "@/components/core/Timeline";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import SuccessIcon from "@/icons/true.svg?react";
import ErrorIcon from "@/icons/false.svg?react";
import PauseIcon from "@/icons/pause.svg?react";
import StopwatchIcon from "@/icons/stopwatch.svg?react";
import Spinner from "@/components/core/Spinner";
import { faker } from "@faker-js/faker";

export default function InputsPreview() {
  return (
    <>
      {/*
       * Sizes
       */}
      <Preview>
        <Preview.Title>Sizes</Preview.Title>
        <Preview.Description>
          Inputs have 4 possible sizes: <b>sm</b>, <b>md</b>, <b>lg</b>, <b>full</b> (default).
        </Preview.Description>
        <PreviewBox className="flex text-sm">
          <Timeline className="h-96">
            <Timeline.Group title={"Monday, May 12"}>
              <Timeline.Item
                icon={<Spinner />}
                label={"in progress"}
                title={<Title time="12:23 PM" duration="1m 57s" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
              <Timeline.Item
                icon={<PauseIcon />}
                label={"pending"}
                severity="info"
                title={<Title time="12:57 PM" duration="32s" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
            </Timeline.Group>
            <Timeline.Group title={"Yesterday"}>
              <Timeline.Item icon={<ErrorIcon />} label={"error"} severity="danger" title={<Title time="8:37 AM" />}>
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
            </Timeline.Group>
            <Timeline.Group title={"Today"}>
              <Timeline.Item
                icon={<SuccessIcon />}
                label={"success"}
                severity="success"
                className=""
                title={<Title time="10:12 AM" duration="527ms" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
              <Timeline.Item
                icon={<SuccessIcon />}
                label={"success"}
                severity="success"
                title={<Title time="10:12 AM" duration="527ms" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
              <Timeline.Item
                icon={<SuccessIcon />}
                label={"success"}
                severity="success"
                title={<Title time="10:12 AM" duration="527ms" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
              <Timeline.Item
                icon={<SuccessIcon />}
                label={"success"}
                severity="success"
                title={<Title time="10:12 AM" duration="527ms" />}
              >
                <div className="flex-col space-y-2">{faker.lorem.lines({ min: 1, max: 20 })}</div>
              </Timeline.Item>
            </Timeline.Group>
          </Timeline>
        </PreviewBox>
      </Preview>
    </>
  );
}

function Title({ time, duration }: { time: string; duration?: string }) {
  return (
    <ul className="list-none flex flex-row items-center h-full text-xs">
      <li className="flex text-divider">{time}</li>
      {duration && (
        <li className="flex text-divider items-center">
          <StopwatchIcon className="mr-1" /> {duration}
        </li>
      )}
    </ul>
  );
}
