import QtQuick
import QtQuick.Shapes
import QtQuick.Effects
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "typo"

  property string status: "idle"
  property bool menuOpen: false

  readonly property color foreground: bar ? bar.barForeground : Color.foreground
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  implicitWidth: buttonContainer.implicitWidth
  implicitHeight: buttonContainer.implicitHeight

  IpcHandler {
    target: "typo"

    function setStatus(s: string): void {
      root.status = String(s || "idle").trim()
    }

    function open(): void {
      root.launchTypo("")
    }

    function show(): void {
      root.launchTypo("")
    }

    function settings(): void {
      root.launchTypo("--settings")
    }

    function toggleMenu(): void {
      root.menuOpen = !root.menuOpen
    }
  }

  Component {
    id: procComponent
    Process {}
  }

  function launchTypo(arg) {
    var cmd = ["typo"]
    if (arg) cmd.push(arg)
    var p = procComponent.createObject(root, { command: cmd })
    if (p) {
      p.exited.connect(function() { p.destroy() })
      p.running = true
    }
  }

  Item {
    id: buttonContainer
    width: button.implicitWidth
    height: button.implicitHeight
    implicitWidth: button.implicitWidth
    implicitHeight: button.implicitHeight

    // 360° Conic-gradient Marquee Border Runner (visible only when processing)
    Item {
      id: runnerContainer
      anchors.fill: parent
      visible: opacity > 0
      opacity: root.status === "processing" ? 1.0 : 0.0

      Behavior on opacity {
        NumberAnimation { duration: 240; easing.type: Easing.OutCubic }
      }

      property real runnerAngle: 0
      NumberAnimation on runnerAngle {
        from: 0
        to: 360
        duration: 3600
        loops: Animation.Infinite
        running: root.status === "processing"
      }

      Shape {
        id: runnerShape
        anchors.fill: parent
        layer.enabled: true
        layer.samples: 4

        readonly property real rOuter: Math.max(2, Style.cornerRadius)
        readonly property real rInner: Math.max(1, Style.cornerRadius - 2)

        ShapePath {
          strokeWidth: 0
          strokeColor: "transparent"
          fillRule: ShapePath.OddEvenFill
          fillGradient: ConicalGradient {
            centerX: runnerShape.width / 2
            centerY: runnerShape.height / 2
            angle: runnerContainer.runnerAngle
            GradientStop { position: 0.0; color: "transparent" }
            GradientStop { position: 0.65; color: "transparent" }
            GradientStop { position: 0.85; color: "#38bdf8" }
            GradientStop { position: 0.94; color: "#ffffff" }
            GradientStop { position: 0.98; color: "#38bdf8" }
            GradientStop { position: 1.0; color: "transparent" }
          }

          // Outer rounded rect
          startX: runnerShape.rOuter; startY: 0
          PathLine { x: runnerShape.width - runnerShape.rOuter; y: 0 }
          PathArc { x: runnerShape.width; y: runnerShape.rOuter; radiusX: runnerShape.rOuter; radiusY: runnerShape.rOuter }
          PathLine { x: runnerShape.width; y: runnerShape.height - runnerShape.rOuter }
          PathArc { x: runnerShape.width - runnerShape.rOuter; y: runnerShape.height; radiusX: runnerShape.rOuter; radiusY: runnerShape.rOuter }
          PathLine { x: runnerShape.rOuter; y: runnerShape.height }
          PathArc { x: 0; y: runnerShape.height - runnerShape.rOuter; radiusX: runnerShape.rOuter; radiusY: runnerShape.rOuter }
          PathLine { x: 0; y: runnerShape.rOuter }
          PathArc { x: runnerShape.rOuter; y: 0; radiusX: runnerShape.rOuter; radiusY: runnerShape.rOuter }

          // Inner cutout (inset by 2px)
          PathMove { x: runnerShape.rInner + 2; y: 2 }
          PathLine { x: runnerShape.width - runnerShape.rInner - 2; y: 2 }
          PathArc { x: runnerShape.width - 2; y: runnerShape.rInner + 2; radiusX: runnerShape.rInner; radiusY: runnerShape.rInner }
          PathLine { x: runnerShape.width - 2; y: runnerShape.height - runnerShape.rInner - 2 }
          PathArc { x: runnerShape.width - runnerShape.rInner - 2; y: runnerShape.height - 2; radiusX: runnerShape.rInner; radiusY: runnerShape.rInner }
          PathLine { x: runnerShape.rInner + 2; y: runnerShape.height - 2 }
          PathArc { x: 2; y: runnerShape.height - runnerShape.rInner - 2; radiusX: runnerShape.rInner; radiusY: runnerShape.rInner }
          PathLine { x: 2; y: runnerShape.rInner + 2 }
          PathArc { x: runnerShape.rInner + 2; y: 2; radiusX: runnerShape.rInner; radiusY: runnerShape.rInner }
        }
      }
    }

    BarIconButton {
      id: button
      anchors.fill: parent
      bar: root.bar
      text: ""
      tooltipText: root.status === "processing" ? "Typo (Processing...)" : "Typo"
      iconComponent: Component {
        Item {
          anchors.fill: parent

          Image {
            id: iconImg
            anchors.centerIn: parent
            width: Style.space(16)
            height: Style.space(16)
            source: Qt.resolvedUrl("assets/trayTemplate.png")
            sourceSize.width: Math.round(width * Screen.devicePixelRatio)
            sourceSize.height: Math.round(height * Screen.devicePixelRatio)
            fillMode: Image.PreserveAspectFit
            visible: false
            layer.enabled: true
          }

          MultiEffect {
            anchors.fill: iconImg
            source: iconImg
            colorization: 1.0
            colorizationColor: root.foreground
          }
        }
      }

      onPressed: function(btn) {
        if (btn === Qt.RightButton) {
          root.menuOpen = !root.menuOpen
        } else if (btn === Qt.LeftButton) {
          root.menuOpen = false
          root.launchTypo("")
        }
      }
    }
  }

  PopupCard {
    id: menuPopup
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.menuOpen
    padding: Style.space(8)
    borderColor: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.45)
    contentWidth: menuPopup.fittedContentWidth(Style.space(190))
    contentHeight: menuPopup.fittedContentHeight(menuColumn.implicitHeight)

    Column {
      id: menuColumn
      anchors.fill: parent
      spacing: Style.space(4)

      Text {
        text: "Typo"
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.font.bodySmall
        font.bold: true
        leftPadding: Style.space(8)
        bottomPadding: Style.space(2)
      }

      Rectangle {
        width: parent.width
        height: 1
        color: Color.popups.border
        opacity: 0.3
      }

      MenuRow {
        iconText: "\uf06e"
        title: "Show Typo"
        onTriggered: {
          root.menuOpen = false
          root.launchTypo("")
        }
      }

      MenuRow {
        iconText: "\uf013"
        title: "Settings"
        onTriggered: {
          root.menuOpen = false
          root.launchTypo("--settings")
        }
      }

      MenuRow {
        iconText: "\uf021"
        title: "Check for Updates"
        onTriggered: {
          root.menuOpen = false
          root.launchTypo("--upgrade")
        }
      }

      Rectangle {
        width: parent.width
        height: 1
        color: Color.popups.border
        opacity: 0.3
      }

      MenuRow {
        iconText: "\uf011"
        title: "Quit Typo"
        onTriggered: {
          root.menuOpen = false
          root.launchTypo("--quit")
        }
      }
    }
  }

  component MenuRow: Item {
    id: rowRoot
    property string iconText: ""
    property string title: ""
    signal triggered()

    width: parent ? parent.width : Style.space(170)
    implicitHeight: Style.space(28)

    Rectangle {
      id: hoverBg
      anchors.fill: parent
      radius: Math.max(2, Style.cornerRadius)
      color: mouseArea.containsMouse ? Style.hoverFillFor(root.foreground, root.foreground) : "transparent"
    }

    Text {
      id: rowIcon
      anchors.verticalCenter: parent.verticalCenter
      anchors.left: parent.left
      anchors.leftMargin: Style.space(8)
      width: Style.space(18)
      horizontalAlignment: Text.AlignHCenter
      text: rowRoot.iconText
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
    }

    Text {
      anchors.verticalCenter: parent.verticalCenter
      anchors.left: rowIcon.right
      anchors.leftMargin: Style.space(8)
      anchors.right: parent.right
      anchors.rightMargin: Style.space(8)
      text: rowRoot.title
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
      elide: Text.ElideRight
    }

    MouseArea {
      id: mouseArea
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: rowRoot.triggered()
    }
  }
}
