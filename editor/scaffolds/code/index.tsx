import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { useRouter } from "next/router";
import { CodeEditor } from "components/code-editor";
import { EditorAppbarFragments } from "components/editor";
import { get_framework_config } from "query/to-code-options-from-query";
import { CodeOptionsControl } from "components/codeui-code-options-control";
import { designToCode, Result } from "@designto/code";
import { config } from "@designto/config";
import {
  ImageRepository,
  MainImageRepository,
} from "@design-sdk/core/assets-repository";
import { DesignInput } from "@designto/config/input";
import { useEditorState, useWorkspaceState } from "core/states";
import { utils_dart } from "utils";
import type { ReflectSceneNode } from "@design-sdk/core";

import { utils as _design_utils } from "@design-sdk/core";
import assert from "assert";
import { RemoteImageRepositories } from "@design-sdk/figma-remote/lib/asset-repository/image-repository";
const designq = _design_utils.query;

export function CodeSegment() {
  const router = useRouter();
  const [result, setResult] = useState<Result>();
  const wstate = useWorkspaceState();
  const [state] = useEditorState();
  const [framework_config, set_framework_config] = useState(
    wstate.preferences.framework_config
  );

  const enable_components =
    wstate.preferences.enable_preview_feature_components_support;

  const thisPageNodes = state.selectedPage
    ? state.design.pages.find((p) => p.id == state.selectedPage).children
    : null;

  const targetId =
    state?.selectedNodes?.length === 1 ? state.selectedNodes[0] : null;

  const container_of_target =
    designq.find_node_by_id_under_inpage_nodes(targetId, thisPageNodes) || null;

  const root = thisPageNodes
    ? container_of_target &&
      (container_of_target.origin === "COMPONENT"
        ? DesignInput.forMasterComponent({
            master: container_of_target,
            all: state.design.pages,
            components: state.design.components,
          })
        : DesignInput.fromDesignWithComponents({
            design: container_of_target,
            components: state.design.components,
          }))
    : state.design?.input;

  const targetted =
    designq.find_node_by_id_under_entry(targetId, root?.entry) ?? root?.entry;

  const targetStateRef =
    useRef<{
      node: ReflectSceneNode;
      config: config.FrameworkConfig;
    }>();
  targetStateRef.current = { node: targetted, config: framework_config };

  const on_result = (result: Result) => {
    if (
      result.framework.framework !==
        targetStateRef?.current?.config.framework ||
      result.id !== targetStateRef?.current?.node.id
    ) {
      return;
    }

    if (framework_config.language == "dart") {
      // special formatter support for dartlang
      result.code.raw = utils_dart.format(result.code.raw);
      result.scaffold.raw = utils_dart.format(result.scaffold.raw);
    }

    setResult(result);
  };

  useEffect(() => {
    const __target = targetted;
    const __framework_config = framework_config;
    if (__target && __framework_config) {
      if (!MainImageRepository.isReady) {
        // this is not the smartest way, but the image repo has a design flaw.
        // this happens when the target node is setted on the query param on first load, when the image repo is not set by the higher editor container.
        MainImageRepository.instance = new RemoteImageRepositories(
          state.design.key,
          {
            // setting this won't load any image btw. (just to prevent errors)
            authentication: { accessToken: "" },
          }
        );
        MainImageRepository.instance.register(
          new ImageRepository(
            "fill-later-assets",
            "grida://assets-reservation/images/"
          )
        );
      }

      const _input = {
        id: __target.id,
        name: __target.name,
        entry: __target,
        repository: root.repository,
      };
      const build_config = {
        ...config.default_build_configuration,
        disable_components: !enable_components,
      };

      // build code without assets fetch
      designToCode({
        input: _input,
        framework: __framework_config,
        asset_config: { skip_asset_replacement: true },
        build_config: build_config,
      })
        .then(on_result)
        .catch(console.error);

      // build final code with asset fetch
      if (!MainImageRepository.instance.empty) {
        designToCode({
          input: root,
          framework: __framework_config,
          asset_config: { asset_repository: MainImageRepository.instance },
          build_config: build_config,
        })
          .then(on_result)
          .catch(console.error);
      }
    }
  }, [targetted?.id, framework_config]);

  const { code, scaffold, name: componentName } = result ?? {};
  return (
    <CodeEditorContainer>
      <EditorAppbarFragments.CodeEditor />
      <CodeOptionsControl
        initialPreset={router.query.framework as string}
        fallbackPreset="react_default"
        onUseroptionChange={(o) => {
          let c;
          switch (o.framework) {
            case "react": {
              switch (o.styling) {
                case "styled-components":
                  c = get_framework_config("react-with-styled-components");
                  break;
                case "inline-css":
                  c = get_framework_config("react-with-inline-css");
                  break;
                case "css-module":
                  c = get_framework_config("react-with-css-module");
                  break;
                case "css":
                  // TODO:
                  break;
              }
              break;
            }
            case "react-native": {
              switch (o.styling) {
                case "style-sheet":
                  c = get_framework_config("react-native-with-style-sheet");
                  break;
                case "styled-components":
                  c = get_framework_config(
                    "react-native-with-styled-components"
                  );
                  break;
                case "inline-style":
                  c = get_framework_config("react-native-with-inline-style");
                  break;
              }
              break;
            }
            case "flutter":
              c = get_framework_config(o.framework);
              break;
            case "vanilla":
              c = get_framework_config(o.framework);
              break;
          }

          assert(c);
          set_framework_config(c);
        }}
      />
      <CodeEditor
        key={code?.raw}
        height="100vh"
        options={{
          automaticLayout: true,
        }}
        files={
          code
            ? {
                "index.tsx": {
                  raw: code.raw,
                  language: framework_config.language,
                  name: "index.tsx",
                },
              }
            : {
                loading: {
                  raw: "\n".repeat(100),
                  language: "text",
                  name: "loading",
                },
              }
        }
      />
    </CodeEditorContainer>
  );
}

const CodeEditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;
