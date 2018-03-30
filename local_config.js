module.exports = {
    AWS_REGION: "us-east-1",
    FFMPEG_CMD: "-r %r -f image2 -s 640x480 -i %i -vcodec libx264 -crf 25 -pix_fmt yuv420p %o",
    STACK_NAME: "bp-fidgetology-demo"
}