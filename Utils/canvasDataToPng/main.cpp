#include <QCoreApplication>
#include <QPainter>
#include <ctime>
#include <vector>
#include <iostream>
#include <QDebug>
#include <fstream>
#include <streambuf>
#include<math.h>
using namespace std;

int main(int argc, char *argv[])
{
    QCoreApplication a(argc, argv);

    std::string fileName = argv[1];
    std::cout<<"fileName: "+fileName<<std::endl;

    ifstream inp(fileName);
    std::string str;
    inp>>str;
    QString qstr = QString::fromStdString(str);

    QStringList list = qstr.split(",");

    int width = 1350;
    int height = 600;
    int pixelSize = 5;
    int localPixelSize = pixelSize;
    int realWidth=floor(width/localPixelSize)+1;
    int realHeight = floor(height/localPixelSize)+1;

    QImage img(realWidth,realHeight,QImage::Format_RGB32);

    int colorCount=0;
    for (int x=0;x<realWidth ;++x) {
        for (int y=0;y<realHeight;++y) {

            if (colorCount<list.size()) {
                img.setPixelColor(x,y,QColor(list[colorCount]));

                colorCount++;
            } else {break;}

        }
    }
    QString qfileName = QString::fromStdString(fileName);
    img.save(qfileName+".png");

    return 0;
}
